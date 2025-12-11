import { LambdaHandler } from "@effect-aws/lambda";
import { Logger } from "@effect-aws/powertools-logger";
import { issuer } from "@openauthjs/openauth";
import { Auth } from "@printdesk/core/auth";
import { AuthContract } from "@printdesk/core/auth/contract";
import { Database } from "@printdesk/core/database";
import { Graph } from "@printdesk/core/graph";
import { IdentityProvidersContract } from "@printdesk/core/identity-providers/contract";
import { Sst } from "@printdesk/core/sst";
import { Constants } from "@printdesk/core/utils/constants";
import * as Cause from "effect/Cause";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Function from "effect/Function";
import * as Layer from "effect/Layer";
import * as Match from "effect/Match";
import * as Redacted from "effect/Redacted";
import * as Runtime from "effect/Runtime";
import * as Schema from "effect/Schema";
import { Hono } from "hono";
import { handle } from "hono/aws-lambda";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import type { APIGatewayProxyEventV2, EffectHandler } from "@effect-aws/lambda";
import type { Context } from "aws-lambda";

class IssuerError extends Data.TaggedError("IssuerError")<{
  readonly cause: unknown;
}> {}

class Issuer extends Effect.Service<Issuer>()("@printdesk/functions/Issuer", {
  dependencies: [
    Database.TransactionManager.Default,
    Auth.Auth.Default,
    Auth.Crypto.Default,
    Sst.Resource.layer,
  ],
  effect: Effect.gen(function* () {
    const db = yield* Database.TransactionManager;
    const auth = yield* Auth.Auth;
    const crypto = yield* Auth.Crypto;
    const resource = yield* Sst.Resource;

    const runtime = yield* Effect.runtime();

    const domain = resource.Domains.pipe(Redacted.value).auth;
    const routerSecret = resource.RouterSecret.pipe(Redacted.value).value;

    const app = new Hono()
      .use(
        createMiddleware<{
          Bindings: { event: APIGatewayProxyEventV2 };
        }>(async (c, next) => {
          if (c.env.event.headers["x-forwarded-host"] !== domain)
            throw new HTTPException(403, { message: "Invalid forwarded host" });

          if (
            c.env.event.headers[Constants.HEADER_KEYS.ROUTER_SECRET] !==
            routerSecret
          )
            throw new HTTPException(403, { message: "Invalid router secret" });

          await next();
        }),
      )
      .route(
        "/",
        issuer({
          subjects: AuthContract.subjects,
          providers: auth.providers,
          success: async (response, result) =>
            Effect.gen(function* () {
              const rawAccessToken = yield* crypto.decodeJwt(
                result.tokenset.access,
              );

              const match = Match.type<keyof typeof auth.providers>().pipe(
                Match.when(Match.is(Constants.ENTRA_ID), (entraId) =>
                  Effect.gen(function* () {
                    const decodeAccessToken = Schema.decodeUnknown(
                      IdentityProvidersContract.EntraIdAccessToken,
                    );
                    const decodeUser = Schema.decodeUnknown(
                      IdentityProvidersContract.EntraIdUser,
                    );

                    const accessToken =
                      yield* decodeAccessToken(rawAccessToken);

                    const userSubjectEffect = Graph.Client.me.pipe(
                      Effect.provide(
                        Graph.Client.Default({
                          authProvider: {
                            getAccessToken: async () => result.tokenset.access,
                          },
                        }),
                      ),
                      Effect.flatMap(decodeUser),
                      Effect.flatMap((user) =>
                        db.withTransaction(() =>
                          auth.handleUser(entraId, accessToken.tenantId, user),
                        ),
                      ),
                    );

                    return {
                      audience: accessToken.audience,
                      userSubjectEffect,
                    };
                  }),
                ),
                Match.exhaustive,
              );

              const userSubject = yield* match(result.provider).pipe(
                Effect.flatMap(({ audience, userSubjectEffect }) =>
                  Effect.zipRight(
                    audience !== result.clientID
                      ? Effect.fail(
                          new AuthContract.InvalidAudienceError({
                            expected: result.clientID,
                            received: audience,
                          }),
                        )
                      : Effect.void,
                    userSubjectEffect,
                  ),
                ),
              );

              return yield* Effect.tryPromise({
                try: () => response.subject(userSubject._tag, userSubject),
                catch: (cause) => new IssuerError({ cause }),
              });
            })
              .pipe(Runtime.runPromiseExit(runtime))
              .then(
                Exit.match({
                  onSuccess: Function.identity,
                  onFailure: (cause) => {
                    if (Cause.isFailure(cause) && Cause.isFailType(cause)) {
                      const error = cause.error;

                      const match = Match.type<typeof error>().pipe(
                        Match.tag(
                          "InvalidAudienceError",
                          (error) =>
                            new HTTPException(401, {
                              cause: error,
                              message: `Audience mismatch: expected ${error.expected}, but received ${error.received}.`,
                              res: new Response(
                                JSON.stringify({
                                  error: "invalid_token",
                                  error_description: "Audience mismatch",
                                }),
                              ),
                            }),
                        ),
                        Match.orElse(
                          (error) => new HTTPException(500, { cause: error }),
                        ),
                      );

                      throw match(error);
                    }

                    throw new HTTPException(500, { cause });
                  },
                }),
              ),
        }),
      )
      .onError((e, c) => {
        Logger.logError(e.message).pipe(Runtime.runSync(runtime));

        if (e instanceof HTTPException) return e.getResponse();

        return c.newResponse(e.message, 500);
      });

    const adapter = handle(app);

    const handler = (event: APIGatewayProxyEventV2, context: Context) =>
      Effect.tryPromise({
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

    return { handler };
  }),
}) {}

const layer = Issuer.Default.pipe(Layer.provide(Sst.Resource.layer));

const effectHandler: EffectHandler<
  APIGatewayProxyEventV2,
  Layer.Layer.Success<typeof layer>,
  Layer.Layer.Error<typeof layer> | IssuerError
> = (event, context) =>
  Issuer.pipe(Effect.flatMap((issuer) => issuer.handler(event, context)));

export const handler = LambdaHandler.make({
  layer,
  handler: effectHandler,
});
