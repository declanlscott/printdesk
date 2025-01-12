import { issuer } from "@openauthjs/openauth";
import { decodeJWT } from "@oslojs/jwt";
import { EntraId } from "@printworks/core/auth";
import { subjects } from "@printworks/core/auth/subjects";
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
        // eslint-disable-next-line @typescript-eslint/unbound-method
        const successHandler = EntraId.getSuccessHandler(ctx.subject);

        return withGraph(
          Graph.Client.init({
            authProvider: (done) => done(null, value.tokenset.access),
          }),
          () => successHandler<object>(decodeJWT(value.tokenset.access)),
        );
      }
      default:
        throw new Error(`unexpected provider: ${value.provider}`);
    }
  },
});

export const handler = handle(app);
