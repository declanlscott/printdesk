import { authorizer } from "@openauthjs/openauth";
import { decodeJWT } from "@oslojs/jwt";
import { Auth } from "@printworks/core/auth";
import { subjects } from "@printworks/core/auth/shared";
import {
  afterTransaction,
  createTransaction,
} from "@printworks/core/drizzle/context";
import { formatChannel } from "@printworks/core/realtime/shared";
import { Replicache } from "@printworks/core/replicache";
import { tenantsTable } from "@printworks/core/tenants/sql";
import { Users } from "@printworks/core/users";
import { userProfilesTable, usersTable } from "@printworks/core/users/sql";
import { Constants } from "@printworks/core/utils/constants";
import { Graph, withGraph } from "@printworks/core/utils/graph";
import { and, eq } from "drizzle-orm";
import { handle } from "hono/aws-lambda";
import * as R from "remeda";
import { Resource } from "sst";

export const handler = handle(
  authorizer({
    subjects,
    providers: {
      [Constants.ENTRA_ID]: Auth.entraIdAdapter({
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
    success: async (ctx, value) => {
      if (value.provider !== Constants.ENTRA_ID)
        throw new Error(`unexpected provider: ${value.provider}`);

      // Entra ID provider success handler
      return withGraph(
        Graph.Client.initWithMiddleware({
          authProvider: { getAccessToken: async () => value.tokenset.access },
        }),
        async () => {
          const { tid: tenantId, aud } = decodeJWT(value.tokenset.access) as {
            [key: string]: unknown;
            aud: string;
            tid?: string;
          };
          if (aud !== Resource.Oauth2.entraId.clientId)
            throw new Error("invalid audience");

          if (!tenantId)
            throw new Error("missing access token tid payload claim");

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
              .leftJoin(usersTable, eq(usersTable.tenantId, tenantsTable.id))
              .leftJoin(
                userProfilesTable,
                eq(userProfilesTable.userId, usersTable.id),
              )
              .where(
                and(
                  eq(usersTable.username, userPrincipalName),
                  eq(usersTable.tenantId, tenantId),
                  eq(userProfilesTable.tenantId, tenantId),
                  eq(tenantsTable.id, tenantId),
                ),
              )
              .then((rows) => rows.at(0));
            if (!result?.tenant) throw new Error("tenant not found");
            if (result.tenant.status !== "active")
              throw new Error("tenant not active");
            if (!result.user) throw new Error("user not found");
            if (result.user.deletedAt) throw new Error("user is deleted");

            const user = {
              ...result.user,
              profile: result.userProfile,
            };

            if (!user.profile) {
              const newUserProfile = await Users.createProfile({
                userId: user.id,
                oauth2UserId: id,
                name: preferredName,
                email: mail,
                tenantId,
              });
              if (!newUserProfile)
                throw new Error("failed to create user profile");

              await afterTransaction(() =>
                Replicache.poke([formatChannel("tenant", tenantId)]),
              );

              return ctx.subject("user", { id, tenantId });
            }

            const existingUserInfo = {
              name: user.profile.name,
              email: user.profile.email,
              username: user.username,
            };

            const freshUserInfo = {
              name: preferredName,
              email: mail,
              username: userPrincipalName,
            };

            if (!R.isDeepEqual(existingUserInfo, freshUserInfo)) {
              if (existingUserInfo.username !== freshUserInfo.username)
                await tx
                  .update(usersTable)
                  .set({ username: freshUserInfo.username })
                  .where(
                    and(
                      eq(usersTable.id, user.id),
                      eq(usersTable.tenantId, tenantId),
                    ),
                  );

              if (
                existingUserInfo.name !== freshUserInfo.name ||
                existingUserInfo.email !== freshUserInfo.email
              )
                await tx
                  .update(userProfilesTable)
                  .set({
                    name: freshUserInfo.name,
                    email: freshUserInfo.email,
                  })
                  .where(
                    and(
                      eq(userProfilesTable.userId, user.id),
                      eq(userProfilesTable.tenantId, tenantId),
                    ),
                  );

              await afterTransaction(() =>
                Replicache.poke([formatChannel("tenant", tenantId)]),
              );
            }

            return ctx.subject("user", { id, tenantId });
          });
        },
      );
    },
  }),
);
