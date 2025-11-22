import * as Schema from "effect/Schema";

export namespace TailscaleContract {
  export class OauthClient extends Schema.Class<OauthClient>("OauthClient")({
    id: Schema.NonEmptyString.pipe(Schema.trimmed(), Schema.Redacted),
    secret: Schema.NonEmptyString.pipe(Schema.trimmed(), Schema.Redacted),
  }) {}
}
