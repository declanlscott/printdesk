import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as LayerMap from "effect/LayerMap";

import { AwsCredentialIdentityProvider, AwsCredentialIdentityProviderError } from ".";
import { Actor, ActorLayerMap } from "../../actors";
import { CloudflareClient } from "../../cloudflare/client";
import { Constants } from "../../utils/constants";
import { S3Bucket } from "../s3/bucket";

const ttl = Duration.hours(1);

export const r2CredentialIdentityProviderLayer = Effect.gen(function* () {
  const cloudflare = yield* CloudflareClient;
  const s3Bucket = yield* S3Bucket;

  return yield* cloudflare
    .createR2TemporaryCredentials({
      bucket: yield* s3Bucket.name,
      endpoint: yield* s3Bucket.endpoint,
      scope: "object-read-write",
      actions: ["PutObject", "GetObject"],
      ttl,
    })
    .pipe(
      Effect.catch((error) => new AwsCredentialIdentityProviderError({ cause: error })),
      Effect.map((credentials) => AwsCredentialIdentityProvider.layerFromSelf({ credentials })),
    );
}).pipe(Layer.unwrap);

export class R2CredentialIdentityProviderLayerMap extends LayerMap.Service<R2CredentialIdentityProviderLayerMap>()(
  "@printdesk/core/aws/credential-identity/R2ProviderLayerMap",
  {
    dependencies: [ActorLayerMap.layer],
    lookup: (actor: typeof Actor.Service) =>
      r2CredentialIdentityProviderLayer.pipe(Layer.provide(ActorLayerMap.get(actor))),
    idleTimeToLive: Constants.DEFAULT_LAYER_MAP_IDLE_TTL,
  },
) {}
