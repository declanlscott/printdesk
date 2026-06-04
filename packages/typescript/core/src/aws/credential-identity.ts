import * as Context from "effect/Context";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";

import type {
  AwsCredentialIdentity as SmithyAwsCredentialIdentity,
  AwsCredentialIdentityProvider,
} from "@smithy/types";

export class AwsCredentialIdentityProviderError extends Schema.TaggedErrorClass<AwsCredentialIdentityProviderError>()(
  "AwsCredentialIdentityProviderError",
  { cause: Schema.Defect() },
) {}

export class AwsCredentialIdentitySchema extends Schema.Class<AwsCredentialIdentitySchema>(
  "AwsCredentialIdentity",
)({
  accessKeyId: Schema.String.pipe(Schema.RedactedFromValue),
  secretAccessKey: Schema.String.pipe(Schema.RedactedFromValue),
  sessionToken: Schema.String.pipe(Schema.RedactedFromValue, Schema.optional),
  credentialScope: Schema.String.pipe(Schema.RedactedFromValue, Schema.optional),
  accountId: Schema.String.pipe(Schema.RedactedFromValue, Schema.optional),
  expiration: Schema.DateTimeUtcFromDate.pipe(Schema.RedactedFromValue, Schema.optional),
}) {}

// @effect-leakable-service
export class AwsCredentialIdentity extends Context.Service<AwsCredentialIdentity>()(
  "@printdesk/core/aws/CredentialIdentity",
  { make: Schema.decodeEffect(AwsCredentialIdentitySchema) },
) {
  public static fromProvider(provider: () => AwsCredentialIdentityProvider) {
    return Effect.tryPromise({
      try: () => provider()(),
      catch: (cause) => new AwsCredentialIdentityProviderError({ cause }),
    }).pipe(Effect.flatMap(this.make));
  }

  public static layer(identity: SmithyAwsCredentialIdentity) {
    return this.make(identity).pipe(Layer.effect(this));
  }

  public static providerLayer(provider: () => AwsCredentialIdentityProvider) {
    return this.fromProvider(provider).pipe(Layer.effect(this));
  }

  public static get values(): Effect.Effect<
    SmithyAwsCredentialIdentity,
    never,
    AwsCredentialIdentity
  > {
    return AwsCredentialIdentity.pipe(
      Effect.map((identity) => ({
        accessKeyId: identity.accessKeyId.pipe(Redacted.value),
        secretAccessKey: identity.secretAccessKey.pipe(Redacted.value),
        sessionToken: identity.sessionToken?.pipe(Redacted.value),
        credentialScope: identity.credentialScope?.pipe(Redacted.value),
        accountId: identity.accountId?.pipe(Redacted.value),
        expiration: identity.expiration?.pipe(Redacted.value, DateTime.toDate),
      })),
    );
  }
}
