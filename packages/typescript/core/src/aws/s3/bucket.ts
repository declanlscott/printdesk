import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Struct from "effect/Struct";

import type { Actor } from "../../actors";
import type { ActorsContract } from "../../actors/contract";

export interface S3BucketShape {
  endpoint: Effect.Effect<string>;
  name: Effect.Effect<string, ActorsContract.ForbiddenActorError, Actor>;
}

export class S3Bucket extends Context.Service<S3Bucket, S3BucketShape>()(
  "@printdesk/core/aws/S3Bucket",
) {
  public static readonly endpoint = this.use(Struct.get("endpoint"));
}
