import * as Cause from "effect/Cause";
import * as Context from "effect/Context";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";

import { S3Bucket } from "../aws/s3/bucket";
import { S3ClientCache } from "../aws/s3/client-cache";
import { ResponseCache } from "../cache/response";
import { AssetsContract } from "./contract";

import type { App } from "../app";
import type { NonEmptyString } from "../utils";

export class AssetsFetcher extends Context.Service<AssetsFetcher>()(
  "@printdesk/core/assets/Fetcher",
  {
    make: Effect.gen(function* () {
      const appContext = yield* Effect.context<App>();
      const S3 = yield* S3ClientCache.get;
      const bucket = yield* S3Bucket;
      const responseCache = yield* ResponseCache;

      const fetchResponse = Effect.fn("Assets.Fetcher.fetchResponse")(function* (
        Key: NonEmptyString,
        maxAge: Duration.Duration,
      ) {
        const syntheticUrl = yield* Effect.provideContext(
          Schema.decodeEffect(AssetsContract.CacheSyntheticUrlFromKey)(Key),
          appContext,
        );

        return yield* responseCache.match(syntheticUrl).pipe(
          Effect.catchTag(
            "NoSuchElementError",
            Effect.fn(function* () {
              const s3 = yield* S3;
              const Bucket = yield* bucket.name;
              const hashTag = yield* Schema.encodeEffect(
                AssetsContract.CacheSyntheticUrlFromHashTag,
              )(syntheticUrl);

              return yield* s3.getObject({ Bucket, Key }).pipe(
                Effect.catchTag("NoSuchKey", () => new Cause.NoSuchElementError()),
                Effect.map((output) =>
                  HttpServerResponse.raw(output.Body, {
                    status: 200,
                    contentType: output.ContentType,
                    contentLength: output.ContentLength,
                  }),
                ),
                Effect.map(
                  HttpServerResponse.setHeaders({
                    "Cache-Control": `max-age=${maxAge.pipe(Duration.toSeconds)}`,
                    "Cache-Tag": hashTag,
                  }),
                ),
                Effect.tap((response) => responseCache.put(syntheticUrl, response)),
              );
            }),
          ),
        );
      });

      return {
        fetchResponse,
      } as const;
    }),
  },
) {
  public static readonly layer = this.make.pipe(Layer.effect(this));
}
