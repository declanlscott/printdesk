import { issuer } from "@openauthjs/openauth";
import { Crypto } from "@printdesk/core/crypto";
import { Database } from "@printdesk/core/database";
import { Graph } from "@printdesk/core/graph";
import { IdentityProvidersContract } from "@printdesk/core/identity/contract";
import { Oauth } from "@printdesk/core/oauth";
import { ClientCredentialsProvider } from "@printdesk/core/oauth/client-credentials";
import { OauthContract } from "@printdesk/core/oauth/contract";
import { EntraIdProvider } from "@printdesk/core/oauth/entra-id";
import { SstResource } from "@printdesk/core/sst/resource";
import { Constants } from "@printdesk/core/utils/constants";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Function from "effect/Function";
import * as Match from "effect/Match";
import * as Redacted from "effect/Redacted";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";
import { handle } from "hono/aws-lambda";
import { HTTPException } from "hono/http-exception";

import type { APIGatewayProxyEventV2 } from "@effect-aws/lambda";
import type { Context } from "aws-lambda";

export class IssuerError extends Schema.TaggedErrorClass<IssuerError>()("IssuerError", {
  cause: Schema.Defect,
}) {}

export const issuerHandler = Effect.fn(function* (event: APIGatewayProxyEventV2, context: Context) {
  const db = yield* Database;

  const { decodeJwt } = yield* Crypto;
  const { handleUser, verifyClient } = yield* Oauth;

  const app = issuer({
    subjects: OauthContract.subjects,
    providers: yield* SstResource.useSync(Struct.get("IdentityProviders")).pipe(
      Effect.map(Redacted.value),
      Effect.map((providers) => ({
        [Constants.ENTRA_ID]: EntraIdProvider({
          tenant: "organizations",
          clientID: providers[Constants.ENTRA_ID].clientId,
          clientSecret: providers[Constants.ENTRA_ID].clientSecret,
          scopes: [...Constants.ENTRA_ID_OAUTH_SCOPES],
        }),
        // TODO: Google provider
        // [Constants.GOOGLE]: GoogleProvider(),
        [Constants.CLIENT_CREDENTIALS]: ClientCredentialsProvider({
          verify: async (...args) =>
            verifyClient(...args)
              .pipe(Effect.runPromiseExit)
              .then(
                Exit.match({
                  onSuccess: Function.identity,
                  onFailure: (cause) =>
                    cause.pipe(
                      Cause.findError,
                      Result.match({
                        onSuccess: (error) => {
                          throw Match.value(error).pipe(
                            Match.tag(
                              "InvalidScopeError",
                              (error) =>
                                new HTTPException(400, {
                                  cause: error,
                                  res: new Response(
                                    JSON.stringify({
                                      error: "invalid_scope",
                                      error_description: error.message,
                                    }),
                                  ),
                                }),
                            ),
                            Match.orElse((error) => new HTTPException(500, { cause: error.cause })),
                          );
                        },
                        onFailure: (cause) => {
                          throw new HTTPException(500, { cause });
                        },
                      }),
                    ),
                }),
              ),
        }),
      })),
    ),
    // select: async (providers, request) => {
    //   // TODO: Filter providers based on tenant
    //   const jsx = (
    //     <Layout>
    //       <form data-component="form"></form>
    //     </Layout>
    //   );

    //   return new Response(null, { status: 302, headers: { Location: `/${"TODO"}/authorize` } });
    // },
    success: async (response, result) => {
      const subject = <TSubjectArgs extends Parameters<typeof response.subject>>(
        ...[properties, opts]: TSubjectArgs extends [string, ...infer TArgs] ? TArgs : never
      ) =>
        Effect.tryPromise({
          try: () => response.subject(properties._tag, properties, opts),
          catch: (cause) => new IssuerError({ cause }),
        });

      return Match.value(result)
        .pipe(
          Match.when({ provider: Match.is(Constants.ENTRA_ID) }, (entraId) =>
            Effect.gen(function* () {
              const accessToken = yield* decodeJwt(
                entraId.tokenset.access,
                IdentityProvidersContract.EntraIdAccessToken,
              );

              if (accessToken.audience !== entraId.clientID)
                return yield* new OauthContract.InvalidAudienceError({
                  expected: entraId.clientID,
                  received: accessToken.audience,
                });

              const user = yield* Graph.use(Struct.get("me")).pipe(
                Effect.provide(
                  Graph.layer({
                    authProvider: { getAccessToken: async () => entraId.tokenset.access },
                  }),
                ),
                Effect.flatMap(Schema.decodeUnknownEffect(IdentityProvidersContract.EntraIdUser)),
                Effect.flatMap((user) =>
                  db.withTransaction(() =>
                    handleUser(entraId.provider, accessToken.tenantId, user),
                  ),
                ),
              );

              return yield* subject(user);
            }),
          ),
          Match.when({ provider: Match.is(Constants.CLIENT_CREDENTIALS) }, (client) =>
            subject(new OauthContract.ClientSubject(client)),
          ),
          Match.exhaustive,
          Effect.runPromiseExit,
        )
        .then(
          Exit.match({
            onSuccess: Function.identity,
            onFailure: (cause) =>
              cause.pipe(
                Cause.findError,
                Result.match({
                  onSuccess: (error) => {
                    throw Match.value(error).pipe(
                      Match.tag(
                        "InvalidAudienceError",
                        (error) =>
                          new HTTPException(401, {
                            cause: error,
                            res: new Response(
                              JSON.stringify({
                                error: "invalid_token",
                                error_description: "Audience mismatch",
                              }),
                            ),
                          }),
                      ),
                      Match.orElse(
                        (error) =>
                          new HTTPException(500, {
                            cause: "cause" in error ? error.cause : error,
                          }),
                      ),
                    );
                  },
                  onFailure: (cause) => {
                    throw new HTTPException(500, { cause });
                  },
                }),
              ),
          }),
        );
    },
  }).onError((e, c) => {
    Effect.logError(e.message).pipe(Effect.runSync);

    if ("getResponse" in e) return e.getResponse();

    return c.newResponse(e.message, 500);
  });

  const adapter = handle(app);

  return yield* Effect.tryPromise({
    try: () =>
      adapter(
        {
          ...event,
          body: event.body ?? null,
          requestContext: {
            ...event.requestContext,
            authentication: null,
            authorizer: {},
          },
        },
        context,
      ),
    catch: (cause) => new IssuerError({ cause }),
  });
});
