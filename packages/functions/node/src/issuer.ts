import { issuer } from "@openauthjs/openauth";
import { decodeJWT } from "@oslojs/jwt";
import { EntraId } from "@printworks/core/auth/entra-id";
import { subjects } from "@printworks/core/auth/subjects";
import { Constants } from "@printworks/core/utils/constants";
import { ApplicationError } from "@printworks/core/utils/errors";
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
            const properties = await EntraId.handleUser(
              decodeJWT(value.tokenset.access),
            );

            return ctx.subject("user", properties);
          },
        );
      }
      default:
        throw new ApplicationError.NonExhaustiveValue(value.provider);
    }
  },
});

export const handler = handle(app);
