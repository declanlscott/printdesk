import { issuer } from "@openauthjs/openauth";
import { decodeJWT } from "@oslojs/jwt";
import { EntraId } from "@printdesk/core/auth/entra-id";
import { subjects } from "@printdesk/core/auth/subjects";
import { Credentials, SignatureV4 } from "@printdesk/core/aws";
import { withAws } from "@printdesk/core/aws/context";
import { SharedErrors } from "@printdesk/core/errors/shared";
import { Graph } from "@printdesk/core/graph";
import { withGraph } from "@printdesk/core/graph/context";
import { Middleware } from "@printdesk/core/hono";
import { Constants } from "@printdesk/core/utils/constants";
import { Hono } from "hono";
import { handle } from "hono/aws-lambda";
import { HTTPException } from "hono/http-exception";
import { Resource } from "sst";
import * as v from "valibot";

const app = new Hono()
  .use(Middleware.sourceValidator)
  .route(
    "*",
    issuer({
      subjects,
      providers: {
        [Constants.ENTRA_ID]: EntraId.provider({
          tenant: "organizations",
          clientID: Resource.Oauth2.entraId.clientId,
          clientSecret: Resource.Oauth2.entraId.clientSecret,
          scopes: [...Constants.ENTRA_ID_OAUTH_SCOPES],
        }),
      },
      success: async (ctx, value) =>
        withAws(
          () => ({
            sigv4: {
              signers: {
                "execute-api": SignatureV4.buildSigner({
                  region: Resource.Aws.region,
                  service: "execute-api",
                }),
                appsync: SignatureV4.buildSigner({
                  region: Resource.Aws.region,
                  service: "appsync",
                  credentials: Credentials.fromRoleChain({
                    RoleArn: Credentials.buildRoleArn(
                      Resource.Aws.tenant.roles.realtimePublisher.nameTemplate,
                    ),
                    RoleSessionName: "Issuer",
                  }),
                }),
              },
            },
          }),
          async () => {
            switch (value.provider) {
              case Constants.ENTRA_ID: {
                const { aud, tid } = v.parse(
                  v.looseObject({ aud: v.string(), tid: v.string() }),
                  decodeJWT(value.tokenset.access),
                );

                if (aud !== value.clientID) throw new Error("invalid audience");

                return withGraph(
                  () =>
                    Graph.Client.init({
                      authProvider: (done) => done(null, value.tokenset.access),
                    }),
                  async () => {
                    const properties = await EntraId.handleUser(tid);

                    return ctx.subject(
                      Constants.SUBJECT_KINDS.USER,
                      properties,
                    );
                  },
                );
              }
              default:
                throw new SharedErrors.NonExhaustiveValue(value.provider);
            }
          },
        ),
    }),
  )
  .onError((e, c) => {
    console.error(e);

    if (e instanceof HTTPException) return e.getResponse();

    return c.newResponse(e.message, 500);
  });

export const handler = handle(app);
