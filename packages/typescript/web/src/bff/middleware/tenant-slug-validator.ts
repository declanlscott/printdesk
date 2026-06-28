import { TenantsContract } from "@printdesk/core/tenants/contract";
import { TenantSlug } from "@printdesk/core/tenants/slug";
import { Constants } from "@printdesk/core/utils/constants";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";
import * as SchemaIssue from "effect/SchemaIssue";
import * as Struct from "effect/Struct";
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";

import { AuthApi } from "../contract/groups/auth";
import { ViteResource } from "../lib/sst";

const FromHostname = Schema.TemplateLiteralParser([
  TenantsContract.Slug,
  ".",
  Schema.NonEmptyString,
]).pipe(
  Schema.decodeTo(TenantsContract.Slug, {
    decode: SchemaGetter.transformOrFail(
      Effect.fn(function* ([slug, , apexDomain]) {
        const resource = yield* ViteResource;

        if (apexDomain !== resource.ApexDomain.pipe(Redacted.value).value)
          return yield* Effect.fail(
            new SchemaIssue.InvalidValue(Option.some(apexDomain), { message: "Invalid hostname" }),
          );

        return slug;
      }),
    ),
    encode: SchemaGetter.forbidden(() => "Not implemented"),
  }),
);

const FromQuery = Schema.Struct({ slug: TenantsContract.Slug }).pipe(
  Schema.encodeKeys({ slug: Constants.URL_PARAM_NAMES.TENANT_SLUG }),
  Schema.decodeTo(TenantsContract.Slug, {
    decode: SchemaGetter.transform(Struct.get("slug")),
    encode: SchemaGetter.forbidden(() => "Not implemented"),
  }),
);

export const tenantSlugValidatorLayer = Effect.gen(function* () {
  const resourceContext = yield* Effect.context<ViteResource>();

  const fromHostname = resourceContext.pipe(
    Context.get(ViteResource),
    Struct.get("Environment"),
    Redacted.value,
    (env) => !env.isDevMode && env.isProdStage,
  );

  return AuthApi.TenantSlugValidator.of(
    Effect.fn(
      function* (httpEffect) {
        if (fromHostname)
          return yield* httpEffect.pipe(
            Effect.provideServiceEffect(
              TenantSlug,
              HttpServerRequest.HttpServerRequest.pipe(
                Effect.map((request) => new URL(request.originalUrl).hostname),
                Effect.flatMap(Schema.decodeUnknownEffect(FromHostname)),
                Effect.provideContext(resourceContext),
              ),
            ),
          );

        return yield* httpEffect.pipe(
          Effect.provideServiceEffect(
            TenantSlug,
            FromQuery.pipe(HttpServerRequest.schemaSearchParams),
          ),
        );
      },
      (effect) => effect.pipe(Effect.catchTag("SchemaError", () => new HttpApiError.BadRequest())),
    ),
  );
}).pipe(Layer.effect(AuthApi.TenantSlugValidator));
