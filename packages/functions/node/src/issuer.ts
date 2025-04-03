import { issuer } from "@openauthjs/openauth";
import { decodeJWT } from "@oslojs/jwt";
import { EntraId } from "@printworks/core/auth/entra-id";
import { subjects } from "@printworks/core/auth/subjects";
import { SharedErrors } from "@printworks/core/errors/shared";
import { Graph } from "@printworks/core/graph";
import { withGraph } from "@printworks/core/graph/context";
import { Constants } from "@printworks/core/utils/constants";
import { handle } from "hono/aws-lambda";
import { Resource } from "sst";

const app = issuer({
  subjects,
  providers: {
    [Constants.ENTRA_ID]: EntraId.provider({
      tenant: "organizations",
      clientID: Resource.Oauth2.entraId.clientId,
      clientSecret: Resource.Oauth2.entraId.clientSecret,
      scopes: [...Constants.ENTRA_ID_SCOPES],
    }),
  },
  success: async (ctx, value) => {
    switch (value.provider) {
      case Constants.ENTRA_ID: {
        return withGraph(
          () =>
            Graph.Client.init({
              authProvider: (done) => done(null, value.tokenset.access),
            }),
          async () => {
            const properties = await EntraId.handleUser(
              decodeJWT(value.tokenset.access),
            );

            return ctx.subject(Constants.SUBJECT_KINDS.USER, properties);
          },
        );
      }
      default:
        throw new SharedErrors.NonExhaustiveValue(value.provider);
    }
  },
});

export const handler = handle(app);
