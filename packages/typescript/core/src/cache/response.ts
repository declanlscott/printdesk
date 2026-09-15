import * as Cache from "effect/Cache";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";

import { Actor } from "../actors";
import { Constants } from "../utils/constants";

import type { TenantId } from "../utils";

export const ResponseCacheStorage = Context.Reference<globalThis.CacheStorage>(
  "@printdesk/core/cache/ResponseStorage",
  { defaultValue: () => globalThis.caches },
);

export class ResponseCacheStorageError extends Schema.TaggedError<ResponseCacheStorageError>()(
  "ResponseCacheStorageError",
  { cause: Schema.Defect() },
) {}

export class PutResponseCacheError extends Schema.TaggedError<PutResponseCacheError>()(
  "PutResponseCacheError",
  { cause: Schema.Defect() },
) {}

export class MatchResponseCacheError extends Schema.TaggedError<MatchResponseCacheError>()(
  "MatchResponseCacheError",
  { cause: Schema.Defect() },
) {}

export class DeleteResponseCacheError extends Schema.TaggedError<DeleteResponseCacheError>()(
  "DeleteResponseCacheError",
  { cause: Schema.Defect() },
) {}

export class ResponseCache extends Context.Service<ResponseCache>()(
  "@printdesk/core/cache/Response",
  {
    make: Effect.gen(function* () {
      const storage = yield* ResponseCacheStorage;
      const instanceCache = yield* Cache.make({
        capacity: Constants.DEFAULT_CACHE_CAPACITY,
        lookup: (tenantId: TenantId) =>
          Effect.tryPromise({
            try: () => storage.open(tenantId),
            catch: (error) => new ResponseCacheStorageError({ cause: error }),
          }),
      });

      const instance = Actor.tenantId.pipe(
        Effect.flatMap((tenantId) => instanceCache.pipe(Cache.get(tenantId))),
      );

      const put = Effect.fn("ResponseCache.put")(
        (url: URL, response: HttpServerResponse.HttpServerResponse) =>
          instance.pipe(
            Effect.flatMap((cache) =>
              Effect.tryPromise({
                try: () => response.pipe(HttpServerResponse.toWeb, (res) => cache.put(url, res)),
                catch: (error) => new PutResponseCacheError({ cause: error }),
              }),
            ),
          ),
      );

      const match = Effect.fn("ResponseCache.match")(
        (url: URL, opts?: globalThis.CacheQueryOptions) =>
          instance.pipe(
            Effect.flatMap((cache) =>
              Effect.tryPromise({
                try: () => cache.match(url, opts),
                catch: (error) => new MatchResponseCacheError({ cause: error }),
              }),
            ),
            Effect.filterOrFail(Predicate.isNotUndefined),
            Effect.map(HttpServerResponse.fromWeb),
          ),
      );

      const delete_ = Effect.fn("ResponseCache.delete")(
        (url: URL, opts?: globalThis.CacheQueryOptions) =>
          instance.pipe(
            Effect.flatMap((cache) =>
              Effect.tryPromise({
                try: () => cache.delete(url, opts),
                catch: (error) => new DeleteResponseCacheError({ cause: error }),
              }),
            ),
          ),
      );

      return {
        put,
        match,
        delete: delete_,
      } as const;
    }),
  },
) {
  public static readonly layer = this.make.pipe(Layer.effect(this));
}
