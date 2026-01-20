import * as HttpApiSchema from "@effect/platform/HttpApiSchema";
import * as Schema from "effect/Schema";

export namespace CredentialsContract {
  export class Identity extends Schema.Class<Identity>("Credentials")({
    accessKeyId: Schema.String.pipe(Schema.Redacted),
    secretAccessKey: Schema.String.pipe(Schema.Redacted),
    sessionToken: Schema.String.pipe(Schema.Redacted, Schema.optional),
    credentialScope: Schema.String.pipe(Schema.Redacted, Schema.optional),
    accountId: Schema.String.pipe(Schema.Redacted, Schema.optional),
    expiration: Schema.DateTimeUtc.pipe(Schema.Redacted, Schema.optional),
  }) {}

  export class ProviderError extends Schema.TaggedError<ProviderError>(
    "CredentialsProviderError",
  )(
    "CredentialsProviderError",
    { cause: Schema.Defect },
    HttpApiSchema.annotations({ status: 500 }),
  ) {}
}
