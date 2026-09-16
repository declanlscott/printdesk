import { S3ClientCache } from "@printdesk/core/aws/s3/client-cache";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Struct from "effect/Struct";

import { SstResource } from "./sst";

export const s3ClientCacheLayer = SstResource.useSync(Struct.get("AssetsBucketTemplate")).pipe(
  Effect.map(Redacted.value),
  Effect.map((bucketTemplate) => S3ClientCache.layer(bucketTemplate.endpoint)),
  Layer.unwrap,
  Layer.provide(SstResource.layer),
);
