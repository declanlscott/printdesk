import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as HttpServerRespondable from "effect/unstable/http/HttpServerRespondable";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";

import type {
  AwsCredentialIdentity as AwsSdkCredentialIdentity,
  AwsCredentialIdentityProvider as AwsSdkCredentialIdentityProvider,
} from "@aws-sdk/types";

export class AwsCredentialIdentityProviderError
  extends Schema.TaggedError<AwsCredentialIdentityProviderError>()(
    "AwsCredentialIdentityProviderError",
    { cause: Schema.Defect() },
    { httpApiStatus: 500 },
  )
  implements HttpServerRespondable.Respondable
{
  // oxlint-disable-next-line class-methods-use-this
  public [HttpServerRespondable.symbol] = () =>
    HttpServerResponse.empty({ status: 500 }).pipe(Effect.succeed);
}

export class AwsCredentialIdentity extends Schema.Class<AwsCredentialIdentity>(
  "AwsCredentialIdentity",
)({
  accessKeyId: Schema.String.pipe(Schema.RedactedFromValue),
  secretAccessKey: Schema.String.pipe(Schema.RedactedFromValue),
  sessionToken: Schema.String.pipe(Schema.RedactedFromValue, Schema.optional),
  credentialScope: Schema.String.pipe(Schema.RedactedFromValue, Schema.optional),
  accountId: Schema.String.pipe(Schema.RedactedFromValue, Schema.optional),
  expiration: Schema.DateTimeUtcFromDate.pipe(Schema.RedactedFromValue, Schema.optional),
}) {
  public get encode() {
    return Effect.succeed(this).pipe(
      Effect.flatMap(Schema.encodeEffect(AwsCredentialIdentity)),
      Effect.orDie,
    );
  }
}

// @effect-leakable-service
export class AwsCredentialIdentityProvider extends Context.Service<AwsCredentialIdentityProvider>()(
  "@printdesk/core/aws/CredentialIdentityProvider",
  {
    make: Effect.fn(function* (smithy: AwsSdkCredentialIdentity) {
      const credentials = yield* Effect.succeed(smithy).pipe(
        Effect.flatMap(Schema.decodeEffect(AwsCredentialIdentity)),
        Effect.mapError((cause) => new AwsCredentialIdentityProviderError({ cause })),
      );

      return { credentials } as const;
    }),
  },
) {
  public static fromProvider(provider: () => AwsSdkCredentialIdentityProvider) {
    return Effect.tryPromise({
      try: () => provider()(),
      catch: (cause) => new AwsCredentialIdentityProviderError({ cause }),
    }).pipe(Effect.flatMap(this.make));
  }

  public static layer(identity: AwsSdkCredentialIdentity) {
    return this.make(identity).pipe(Layer.effect(this), Layer.fresh);
  }

  public static providerLayer(provider: () => AwsSdkCredentialIdentityProvider) {
    return this.fromProvider(provider).pipe(Layer.effect(this), Layer.fresh);
  }
}
