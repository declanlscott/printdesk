import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Struct from "effect/Struct";

import { Actor } from "../actors";
import { S3Bucket } from "../aws/s3/bucket";
import { SstResource } from "../sst/resource";
import { tenantTemplate } from "../utils";

export const makeAssetsS3Bucket = Effect.gen(function* () {
  const bucketTemplate = yield* SstResource.useSync(Struct.get("AssetsBucketTemplate")).pipe(
    Effect.map(Redacted.value),
  );

  const endpoint = Effect.succeed(bucketTemplate.endpoint);
  const name = Actor.tenantId.pipe(Effect.map(tenantTemplate(bucketTemplate.name)));

  return {
    endpoint,
    name,
  } as const;
});

export const assetsS3BucketLayer = makeAssetsS3Bucket.pipe(Layer.effect(S3Bucket));
