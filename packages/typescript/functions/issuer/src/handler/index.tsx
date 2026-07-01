import { issuer } from "@openauthjs/openauth";
import { Layout } from "@openauthjs/openauth/ui/base";
import { Crypto } from "@printdesk/core/crypto";
import { Graph } from "@printdesk/core/graph";
import { IdentityProvidersContract } from "@printdesk/core/identity/contract";
import { IdentityProvidersRepository } from "@printdesk/core/identity/providers-repository";
import { Oauth } from "@printdesk/core/oauth";
import { ClientCredentialsProvider } from "@printdesk/core/oauth/client-credentials";
import { OauthContract } from "@printdesk/core/oauth/contract";
import { EntraIdProvider } from "@printdesk/core/oauth/entra-id";
import { GoogleProvider } from "@printdesk/core/oauth/google";
import { SstResource } from "@printdesk/core/sst/resource";
import { TenantsContract } from "@printdesk/core/tenants/contract";
import { Constants } from "@printdesk/core/utils/constants";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import * as Record from "effect/Record";
import * as Redacted from "effect/Redacted";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";
import { handle } from "hono/aws-lambda";
import { HTTPException } from "hono/http-exception";

import { providerMetadata } from "../lib/metadata";
import { runPromise } from "../lib/runtime";

import type { APIGatewayProxyEventV2 } from "@effect-aws/lambda";
import type { Context } from "aws-lambda";

export class IssuerError extends Schema.TaggedErrorClass<IssuerError>()("IssuerError", {
  cause: Schema.Defect(),
}) {}

export const handler = Effect.fn(function* (event: APIGatewayProxyEventV2, context: Context) {
  const { decodeJwt } = yield* Crypto;
  const { handleUser, verifyClient } = yield* Oauth.Oauth;
  const identityProvidersRepository = yield* IdentityProvidersRepository;

  const app = issuer({
    subjects: OauthContract.subjects,
    providers: yield* SstResource.useSync(Struct.get("IdentityProviders")).pipe(
      Effect.map(Redacted.value),
      Effect.map((providers) => ({
        [Constants.CLIENT_CREDENTIALS]: ClientCredentialsProvider({
          verify: (...args) => verifyClient(...args).pipe(runPromise(Effect.runPromiseExit)),
        }),
        [Constants.ENTRA_ID]: EntraIdProvider({
          tenant: "organizations",
          clientID: providers[Constants.ENTRA_ID].clientId,
          clientSecret: providers[Constants.ENTRA_ID].clientSecret,
          scopes: [...Constants.ENTRA_ID_OAUTH_SCOPES],
        }),
        [Constants.GOOGLE]: GoogleProvider(),
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
        .pipe(
          Effect.map(
            Array.filterMap((provider) =>
              Record.keys(providers).includes(provider.kind) && !provider.deletedAt
                ? Result.succeed(provider.kind)
                : Result.failVoid,
            ),
          ),
          runPromise(Effect.runPromiseExit),
        );

      if (tenantProviders.length === 0) throw new HTTPException(404);
      if (tenantProviders.length === 1)
        return new Response(null, {
          status: 302,
          // oxlint-disable-next-line typescript/no-non-null-assertion
          headers: { Location: `/${tenantProviders[0]!}/authorize` },
        });

      const jsx = (
        <Layout>
          <div data-component="form">
            {Array.map(tenantProviders, (provider) => {
              const { name, icon } = providerMetadata[provider];

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
    success: (response, result) => {
      const subject = <TSubjectArgs extends Parameters<typeof response.subject>>(
        ...[properties, opts]: TSubjectArgs extends [string, ...infer TArgs] ? TArgs : never
      ) =>
        Effect.tryPromise({
          try: () => response.subject(properties._tag, properties, opts),
          catch: (cause) => new IssuerError({ cause }),
        });

      return Match.value(result).pipe(
        Match.when({ provider: Match.is(Constants.CLIENT_CREDENTIALS) }, (client) =>
          subject(new OauthContract.ClientSubject(client)),
        ),
        Match.when({ provider: Match.is(Constants.ENTRA_ID) }, (entraId) =>
          Effect.gen(function* () {
            const accessToken = yield* decodeJwt(
              entraId.tokenset.access,
              IdentityProvidersContract.EntraIdAccessToken,
            );

            if (accessToken.audience !== entraId.clientID)
              return yield* new OauthContract.InvalidAudienceError({
                expected: IdentityProvidersContract.Audience.make(entraId.clientID),
                received: accessToken.audience,
              });

            const user = yield* Graph.use(Struct.get("me")).pipe(
              Effect.provide(
                Graph.layer({
                  authProvider: { getAccessToken: async () => entraId.tokenset.access },
                }),
              ),
              Effect.flatMap(Schema.decodeUnknownEffect(IdentityProvidersContract.EntraIdUser)),
              Effect.flatMap((user) => handleUser(entraId.provider, accessToken.tenantId, user)),
            );

            return yield* subject(user);
          }),
        ),
        Match.when({ provider: Match.is(Constants.GOOGLE) }, (google) =>
          Effect.fail(new IdentityProvidersContract.NotImplementedError({ kind: google.provider })),
        ),
        Match.exhaustive,
        runPromise(Effect.runPromiseExit),
      );
    },
  }).onError((e, c) =>
    "getResponse" in e
      ? e.getResponse()
      : c.json({ error: "server_error", error_description: e.message }, 500),
  );

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
