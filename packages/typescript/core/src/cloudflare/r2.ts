import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Struct from "effect/Struct";

import { AwsCredentialIdentityProvider } from "../aws/credential-identity";
import { S3Credentials } from "../aws/s3/credentials";
import { SstResource } from "../sst/resource";

export const makeR2S3Credentials = SstResource.useSync(Struct.get("R2S3Credentials")).pipe(
  Effect.map(Redacted.value),
  Effect.flatMap(AwsCredentialIdentityProvider.make),
  Effect.map(Struct.get("credentials")),
);

export const r2S3CredentialsLayer = makeR2S3Credentials.pipe(Layer.effect(S3Credentials));
