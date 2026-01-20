import { HttpApiError } from "@effect/platform";
import * as HttpServerRequest from "@effect/platform/HttpServerRequest";
import { ActorsApi } from "@printdesk/core/actors/api";
import { ActorsContract } from "@printdesk/core/actors/contract";
import { Crypto } from "@printdesk/core/auth/crypto";
import { Oauth } from "@printdesk/core/auth/oauth";
import { ColumnsContract } from "@printdesk/core/columns/contract";
import { Tenants } from "@printdesk/core/tenants";
import { Constants } from "@printdesk/core/utils/constants";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";
import * as Tuple from "effect/Tuple";

const PublicHeaders = Schema.Struct({});
const SystemHeaders = Schema.Struct({
  tenantId: ColumnsContract.TenantId.pipe(
    Schema.propertySignature,
    Schema.fromKey(Constants.HEADER_NAMES.TENANT_ID),
  ),
  apiKey: Schema.String.pipe(
    Schema.Redacted,
    Schema.propertySignature,
    Schema.fromKey(Constants.HEADER_NAMES.API_KEY),
  ),
});
const bearerPrefix = "Bearer ";
const UserHeaders = Schema.Struct({
  bearerToken: Schema.TemplateLiteralParser(
    Schema.Literal(bearerPrefix),
    Schema.String,
  ).pipe(
    Schema.transform(Schema.String.pipe(Schema.Redacted), {
      strict: true,
      decode: Tuple.getSecond,
      encode: (token) =>
        [bearerPrefix, token.slice(bearerPrefix.length)] as const,
    }),
    Schema.propertySignature,
    Schema.fromKey("authorization"),
  ),
});

export const actorLayer = Effect.gen(function* () {
  const tenantMetadataRepository = yield* Tenants.MetadataRepository;
  const crypto = yield* Crypto;
  const oauth = yield* Oauth.Client;

  return ActorsApi.Actor.of(
    Effect.gen(function* () {
      const headers = yield* Schema.Union(
        PublicHeaders,
        SystemHeaders,
        UserHeaders,
      ).pipe(
        HttpServerRequest.schemaHeaders,
        Effect.catchTag("ParseError", (e) =>
          HttpApiError.HttpApiDecodeError.refailParseError(e),
        ),
      );

      if ("apiKey" in headers) {
        const hash = yield* tenantMetadataRepository
          .findByTenant(headers.tenantId)
          .pipe(
            Effect.catchTag(
              "NoSuchElementException",
              () => new HttpApiError.Unauthorized(),
            ),
            Effect.map(Struct.get("apiKeyHash")),
            Effect.filterOrFail(
              Predicate.isNotNull,
              () => new HttpApiError.Unauthorized(),
            ),
          );

        yield* crypto.verifySecret(headers.apiKey, hash);

        return new ActorsContract.Actor({
          properties: new ActorsContract.SystemActor({
            tenantId: headers.tenantId,
          }),
        });
      }

      if ("bearerToken" in headers) {
        const { subject } = yield* oauth
          .verify(headers.bearerToken)
          .pipe(
            Effect.catchTag("ParseError", (e) =>
              HttpApiError.HttpApiDecodeError.refailParseError(e),
            ),
          );

        return new ActorsContract.Actor({
          properties: new ActorsContract.UserActor(subject.properties),
        });
      }

      return new ActorsContract.Actor({
        properties: new ActorsContract.PublicActor(),
      });
    }),
  );
}).pipe(
  Layer.effect(ActorsApi.Actor),
  Layer.provide(Tenants.MetadataRepository.Default),
  Layer.provide(Crypto.Default),
  Layer.provide(
    Oauth.Client.Default({ clientID: Constants.OPENAUTH_CLIENT_IDS.API }),
  ),
);
