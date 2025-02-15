import { issuer } from "@openauthjs/openauth";
import { decodeJWT } from "@oslojs/jwt";
import { withActor } from "@printworks/core/actors/context";
import { EntraId } from "@printworks/core/auth/entra-id";
import { subjects } from "@printworks/core/auth/subjects";
import { poke } from "@printworks/core/replicache/poke";
import { useTenant } from "@printworks/core/tenants/context";
import { Credentials, SignatureV4, withAws } from "@printworks/core/utils/aws";
import { Constants } from "@printworks/core/utils/constants";
import { Graph, withGraph } from "@printworks/core/utils/graph";
import { handle } from "hono/aws-lambda";
import { Resource } from "sst";

const app = issuer({
  subjects,
  providers: {
    [Constants.ENTRA_ID]: EntraId.provider({
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
    switch (value.provider) {
      case Constants.ENTRA_ID: {
        return withGraph(
          Graph.Client.init({
            authProvider: (done) => done(null, value.tokenset.access),
          }),
          async () => {
            const { shouldPoke, properties } = await EntraId.handleUser(
              decodeJWT(value.tokenset.access),
            );

            return withActor({ type: "user", properties }, async () => {
              if (shouldPoke)
                withAws(
                  {
                    sigv4: {
                      signers: {
                        "execute-api": SignatureV4.buildSigner({
                          region: Resource.Aws.region,
                          service: "execute-api",
                        }),
                        appsync: SignatureV4.buildSigner({
                          region: Resource.Aws.region,
                          service: "appsync",
                          credentials: Credentials.fromRoleChain([
                            {
                              RoleArn: Credentials.buildRoleArn(
                                Resource.Aws.account.id,
                                Resource.Aws.tenant.roles.realtimePublisher
                                  .nameTemplate,
                                useTenant().id,
                              ),
                              RoleSessionName: "Issuer",
                            },
                          ]),
                        }),
                      },
                    },
                  },
                  async () => poke(["/tenant"]),
                );

              return ctx.subject("user", properties);
            });
          },
        );
      }
      default:
        throw new Error(`unexpected provider: ${value.provider}`);
    }
  },
});

export const handler = handle(app);
