import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { S3Bucket } from "../aws/s3/bucket";
import { S3ClientCache } from "../aws/s3/client-cache";

import type { S3Service$ } from "@effect-aws/client-s3";

export class AssetsPresigner extends Context.Service<AssetsPresigner>()(
  "@printdesk/core/assets/Presigner",
  {
    make: Effect.gen(function* () {
      const S3 = yield* S3ClientCache.get;
      const bucket = yield* S3Bucket;

      const presignPutUrl = Effect.fn("AssetsPresigner.presignPutUrl")(function* (
        input: Omit<Parameters<S3Service$["putObject"]>[0], "Bucket">,
      ) {
        const s3 = yield* S3;
        const Bucket = yield* bucket.name;

        return yield* s3.putObject({ ...input, Bucket }, { presigned: true });
      });

      const presignGetUrl = Effect.fn("AssetsPresigner.presignGetUrl")(function* (
        input: Omit<Parameters<S3Service$["getObject"]>[0], "Bucket">,
      ) {
        const s3 = yield* S3;
        const Bucket = yield* bucket.name;

        return yield* s3.getObject({ ...input, Bucket }, { presigned: true });
      });

      return {
        presignPutUrl,
        presignGetUrl,
      } as const;
    }),
  },
) {
  public static readonly layer = this.make.pipe(Layer.effect(this));
}
