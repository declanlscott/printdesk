import { AwsCredentialIdentityProvider } from "@printdesk/core/aws/credential-identity";
import { S3Credentials } from "@printdesk/core/aws/s3/credentials";
import { Cloudflare } from "@printdesk/core/cloudflare";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Struct from "effect/Struct";

import { SstResource } from "./sst";

export const cloudflareLayer = Effect.gen(function* () {
  const cloudflare = yield* SstResource.useSync(Struct.get("Cloudflare")).pipe(
    Effect.map(Redacted.value),
  );

  return {
    account: cloudflare.account,
    apiToken: Redacted.make(cloudflare.apiToken),
  };
}).pipe(Layer.effect(Cloudflare), Layer.provide(SstResource.layer));

export const makeR2S3Credentials = SstResource.useSync(Struct.get("R2S3Credentials")).pipe(
  Effect.map(Redacted.value),
  Effect.flatMap(AwsCredentialIdentityProvider.make),
  Effect.map(Struct.get("credentials")),
);

export const r2S3CredentialsLayer = makeR2S3Credentials.pipe(Layer.effect(S3Credentials));
