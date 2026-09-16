import * as Context from "effect/Context";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import { AssetsFetcher } from "../assets/fetcher";
import { ImagesContract } from "./contract";

import type { NonEmptyString } from "../utils";

export class ImagesFetcher extends Context.Service<ImagesFetcher>()(
  "@printdesk/core/images/Fetcher",
  {
    make: Effect.gen(function* () {
      const fetcher = yield* AssetsFetcher;

      const fetchResponse = Effect.fn("ImagesFetcher.fetchResponse")((image: NonEmptyString) =>
        Schema.encodeEffect(ImagesContract.Key)(["images/", image]).pipe(
          Effect.flatMap((key) => fetcher.fetchResponse(key, Duration.weeks(52))),
        ),
      );

      return {
        fetchResponse,
      } as const;
    }),
  },
) {
  public static readonly layer = this.make.pipe(Layer.effect(this));
}
