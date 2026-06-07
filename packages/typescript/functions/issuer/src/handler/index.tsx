import { issuer } from "@openauthjs/openauth";
import { Layout } from "@openauthjs/openauth/ui/base";
import { Crypto } from "@printdesk/core/crypto";
import { Database } from "@printdesk/core/database";
import { Graph } from "@printdesk/core/graph";
import { IdentityProvidersContract } from "@printdesk/core/identity/contract";
import { IdentityProvidersRepository } from "@printdesk/core/identity/providers-repository";
import { Oauth } from "@printdesk/core/oauth";
import { ClientCredentialsProvider } from "@printdesk/core/oauth/client-credentials";
import { OauthContract } from "@printdesk/core/oauth/contract";
import { EntraIdProvider } from "@printdesk/core/oauth/entra-id";
import { SstResource } from "@printdesk/core/sst/resource";
import { TenantsContract } from "@printdesk/core/tenants/contract";
import { Constants } from "@printdesk/core/utils/constants";
import * as Array from "effect/Array";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Function from "effect/Function";
import * as Match from "effect/Match";
import * as Record from "effect/Record";
import * as Redacted from "effect/Redacted";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";
import { handle } from "hono/aws-lambda";
import { HTTPException } from "hono/http-exception";

import type { APIGatewayProxyEventV2 } from "@effect-aws/lambda";
import type { Context } from "aws-lambda";

export class IssuerError extends Schema.TaggedErrorClass<IssuerError>()("IssuerError", {
  cause: Schema.Defect(),
}) {}

export const issuerHandler = Effect.fn(function* (event: APIGatewayProxyEventV2, context: Context) {
  const db = yield* Database;

  const { decodeJwt } = yield* Crypto;
  const { handleUser, verifyClient } = yield* Oauth;
  const identityProvidersRepository = yield* IdentityProvidersRepository;

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
                  onFailure(cause) {
                    throw cause.pipe(
                      Cause.findError,
                      Result.match({
                        onSuccess: (error) =>
                          Match.value(error).pipe(
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
                          ),
                        onFailure: (cause) => new HTTPException(500, { cause }),
                      }),
                    );
                  },
                }),
              ),
        }),
      })),
    ),
    select: async (providers, request) => {
      const tenantSlug = Schema.decodeUnknownResult(TenantsContract.Slug)(
        new URL(request.url).searchParams.get(Constants.URL_PARAM_NAMES.TENANT_SLUG),
      );
      if (Result.isFailure(tenantSlug))
        throw new HTTPException(400, {
          message: `Invalid tenant_slug: ${tenantSlug.failure.message}`,
        });

      const tenantProviders = await identityProvidersRepository
        .findByTenantSlug(tenantSlug.success)
        .pipe(Effect.runPromiseExit)
        .then(
          Exit.match({
            onSuccess: Array.filterMap((provider) =>
              !provider.deletedAt ? Result.succeed(provider.kind) : Result.failVoid,
            ),
            onFailure(cause) {
              throw cause.pipe(
                Cause.findError,
                Result.match({
                  onSuccess: (error) => new HTTPException(500, { cause: error.cause }),
                  onFailure: (cause) => new HTTPException(500, { cause }),
                }),
              );
            },
          }),
        )
        .then(Array.intersection(Record.keys(providers)));

      if (tenantProviders.length === 0) throw new HTTPException(404);
      if (tenantProviders.length === 1)
        return new Response(null, {
          status: 302,
          // oxlint-disable-next-line typescript/no-non-null-assertion
          headers: { Location: `/${tenantProviders[0]!}/authorize` },
        });

      const metadata = {
        [Constants.ENTRA_ID]: {
          name: "Microsoft",
          icon: (
            <svg
              role="img"
              viewBox="0 0 256 256"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid"
            >
              <path fill="#F1511B" d="M121.666 121.666H0V0h121.666z" />
              <path fill="#80CC28" d="M256 121.666H134.335V0H256z" />
              <path fill="#00ADEF" d="M121.663 256.002H0V134.336h121.663z" />
              <path fill="#FBBC09" d="M256 256.002H134.335V134.336H256z" />
            </svg>
          ),
        },
        [Constants.GOOGLE]: {
          name: "Google",
          icon: (
            <svg role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
              <path
                fill="currentColor"
                d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
              ></path>
            </svg>
          ),
        },
      } as const;

      const jsx = (
        <Layout>
          <div data-component="form">
            {Array.map(tenantProviders, (provider) => {
              const { name, icon } = metadata[provider];

              return (
                <a href={`/${provider}/authorize`} data-component="button" data-color="ghost">
                  <i data-slot="icon">{icon}</i>
                  Continue with {name}
                </a>
              );
            })}
          </div>
        </Layout>
      );

      return new Response(jsx.toString(), { headers: { "Content-Type": "text/html" } });
    },
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
