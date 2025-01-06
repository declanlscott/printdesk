import { authorizer } from "@openauthjs/openauth";
import { decodeJWT } from "@oslojs/jwt";
import { EntraId } from "@printworks/core/auth";
import { subjects } from "@printworks/core/auth/shared";
import { oauth2ProvidersTable } from "@printworks/core/auth/sql";
import {
  afterTransaction,
  createTransaction,
} from "@printworks/core/drizzle/context";
import { Replicache } from "@printworks/core/replicache";
import { Api } from "@printworks/core/tenants/api";
import { tenantsTable } from "@printworks/core/tenants/sql";
import { Users } from "@printworks/core/users";
import { userProfilesTable, usersTable } from "@printworks/core/users/sql";
import { SignatureV4, Sts, withAws } from "@printworks/core/utils/aws";
import { Constants } from "@printworks/core/utils/constants";
import { Graph, withGraph } from "@printworks/core/utils/graph";
import { and, eq, isNull } from "drizzle-orm";
import { handle } from "hono/aws-lambda";
import * as R from "remeda";
import { Resource } from "sst";

export const handler = handle(
  authorizer({
    subjects,
    providers: {
      [Constants.ENTRA_ID]: EntraId.adapter({
        tenant: "organizations",
        clientID: Resource.Oauth2.entraId.clientId,
        clientSecret: Resource.Oauth2.entraId.clientSecret,
        scopes: [
          "openid",
          "profile",
          "email",
          "offline_access",
          "User.Read",
          "User.ReadBasic.All",
        ],
      }),
    },
    success: async (ctx, value) =>
      withAws(
        {
          sigv4: {
            signers: {
              "execute-api": SignatureV4.buildSigner({
                region: Resource.Aws.region,
                service: "execute-api",
              }),
            },
          },
          sts: { client: new Sts.Client() },
        },
        async () =>
          withAws(
            {
              sigv4: {
                signers: {
                  appsync: SignatureV4.buildSigner({
                    region: Resource.Aws.region,
                    service: "appsync",
                    credentials: await Sts.getAssumeRoleCredentials({
                      type: "name",
                      accountId: await Api.getAccountId(),
                      roleName: Resource.Aws.tenant.realtimePublisherRole.name,
                      roleSessionName: "Authorizer",
                    }),
                  }),
                },
              },
            },
            async () => {
              switch (value.provider) {
                case Constants.ENTRA_ID:
                  return withGraph(
                    Graph.Client.init({
                      authProvider: (done) => done(null, value.tokenset.access),
                    }),
                    async () => {
                      const { tid, aud } = decodeJWT(value.tokenset.access) as {
                        [key: string]: unknown;
                        aud: string;
                        tid?: string;
                      };
                      if (aud !== Resource.Oauth2.entraId.clientId)
                        throw new Error("invalid audience");

                      if (!tid)
                        throw new Error(
                          "missing access token tid payload claim",
                        );

                      const { id, userPrincipalName, preferredName, mail } =
                        await Graph.me();
                      if (!id || !userPrincipalName || !preferredName || !mail)
                        throw new Error("missing graph user data");

                      return createTransaction(async (tx) => {
                        const result = await tx
                          .select({
                            tenant: tenantsTable,
                            user: usersTable,
                            userProfile: userProfilesTable,
                          })
                          .from(tenantsTable)
                          .innerJoin(
                            oauth2ProvidersTable,
                            eq(oauth2ProvidersTable.tenantId, tenantsTable.id),
                          )
                          .leftJoin(
                            usersTable,
                            eq(usersTable.tenantId, tenantsTable.id),
                          )
                          .leftJoin(
                            userProfilesTable,
                            eq(userProfilesTable.userId, usersTable.id),
                          )
                          .where(
                            and(
                              eq(oauth2ProvidersTable.id, tid),
                              eq(tenantsTable.status, "active"),
                              isNull(tenantsTable.deletedAt),
                              eq(usersTable.username, userPrincipalName),
                            ),
                          )
                          .then(R.first());
                        if (!result)
                          throw new Error("tenant not found or inactive");
                        if (!result.user) throw new Error("user not found");
                        if (result.user.deletedAt)
                          throw new Error("user is deleted");

                        const user = {
                          ...result.user,
                          profile: result.userProfile,
                        };

                        const tenantId = result.tenant.id;

                        if (!user.profile) {
                          await Users.createProfile({
                            userId: user.id,
                            oauth2UserId: id,
                            oauth2ProviderId: tid,
                            name: preferredName,
                            email: mail,
                            tenantId,
                          });

                          await afterTransaction(() =>
                            Replicache.poke(["/tenant"]),
                          );

                          return ctx.subject("user", {
                            id: user.id,
                            tenantId,
                          });
                        }

                        let userHasChanged = false;

                        if (user.username !== userPrincipalName) {
                          await tx
                            .update(usersTable)
                            .set({ username: userPrincipalName })
                            .where(
                              and(
                                eq(usersTable.id, user.id),
                                eq(usersTable.tenantId, tenantId),
                              ),
                            );

                          userHasChanged = true;
                        }

                        if (
                          user.profile.name !== preferredName ||
                          user.profile.email !== mail
                        ) {
                          await tx
                            .update(userProfilesTable)
                            .set({
                              name: user.profile.name,
                              email: mail,
                            })
                            .where(
                              and(
                                eq(userProfilesTable.userId, user.id),
                                eq(userProfilesTable.tenantId, tenantId),
                              ),
                            );

                          userHasChanged = true;
                        }

                        if (userHasChanged)
                          await afterTransaction(() =>
                            Replicache.poke(["/tenant"]),
                          );

                        return ctx.subject("user", {
                          id: user.id,
                          tenantId,
                        });
                      });
                    },
                  );
                default:
                  throw new Error(`unexpected provider: ${value.provider}`);
              }
            },
          ),
      ),
  }),
);
