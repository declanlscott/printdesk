import * as ByteSize from "effect/ByteSize";
import * as Context from "effect/Context";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import { AssetsPresigner } from "../assets/presigner";
import { ImagesContract } from "./contract";

import type { NonEmptyString } from "../utils";

export class ImagesPresigner extends Context.Service<ImagesPresigner>()(
  "@printdesk/core/images/Presigner",
  {
    make: Effect.gen(function* () {
      const presigner = yield* AssetsPresigner;

      const presignPutUrl = Effect.fn("ImagesPresigner.presignPutUrl")(function* (
        image: NonEmptyString,
        payload: ImagesContract.PresignedUrlPayload,
      ) {
        const Key = yield* Schema.encodeEffect(ImagesContract.Key)(["images/", image]);
        const expiresAt = yield* DateTime.now.pipe(
          Effect.map(DateTime.addDuration(payload.expiresIn)),
        );

        return yield* presigner
          .presignPutUrl({
            Key,
            ContentType: payload.mimeType,
            ContentLength: ByteSize.toNumberUnsafe(payload.byteSize),
            Expires: expiresAt.pipe(DateTime.toDateUtc),
          })
          .pipe(Effect.map((url) => ({ url: new URL(url), expiresAt })));
      });

      return {
        presignPutUrl,
      } as const;
    }),
  },
) {
  public static readonly layer = this.make.pipe(Layer.effect(this));
}
