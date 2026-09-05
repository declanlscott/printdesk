import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";

import { Actor } from "../actors";

export const CacheStorage = Context.Reference<globalThis.CacheStorage>(
  "@printdesk/core/cache/Storage",
  { defaultValue: () => globalThis.caches },
);

export class CacheInstanceError extends Schema.TaggedError<CacheInstanceError>()(
  "CacheInstanceError",
  { cause: Schema.Defect() },
) {}

export class CacheInstance extends Context.Service<CacheInstance, globalThis.Cache>()(
  "@printdesk/core/cache/Instance",
) {
  public static readonly makeTenant = Effect.gen(function* () {
    const tenantId = yield* Actor.use(Struct.get("tenantId"));
    const storage = yield* CacheStorage;

    return yield* Effect.tryPromise({
      try: () => storage.open(`tenant:${tenantId}`),
      catch: (error) => new CacheInstanceError({ cause: error }),
    });
  });

  public static readonly tenantLayer = this.makeTenant.pipe(Layer.effect(this));
}

export class CachePutError extends Schema.TaggedError<CachePutError>()("CachePutError", {
  cause: Schema.Defect(),
}) {}

export class CacheMatchError extends Schema.TaggedError<CacheMatchError>()("CacheMatchError", {
  cause: Schema.Defect(),
}) {}

export class CacheDeleteError extends Schema.TaggedError<CacheDeleteError>()("CacheDeleteError", {
  cause: Schema.Defect(),
}) {}

export class CacheClient extends Context.Service<CacheClient>()("@printdesk/core/cache/Client", {
  make: Effect.gen(function* () {
    const instance = yield* CacheInstance;

    const put = Effect.fn("CacheClient.put")(
      (url: URL, response: HttpServerResponse.HttpServerResponse) =>
        Effect.tryPromise({
          try: () => response.pipe(HttpServerResponse.toWeb, (res) => instance.put(url, res)),
          catch: (error) => new CachePutError({ cause: error }),
        }),
    );

    const match = Effect.fn("CacheClient.match")((url: URL, opts?: globalThis.CacheQueryOptions) =>
      Effect.tryPromise({
        try: () => instance.match(url, opts),
        catch: (error) => new CachePutError({ cause: error }),
      }).pipe(Effect.filterOrFail(Predicate.isNotUndefined)),
    );

    const delete_ = Effect.fn("CacheClient.delete")(
      (url: URL, opts?: globalThis.CacheQueryOptions) =>
        Effect.tryPromise({
          try: () => instance.delete(url, opts),
          catch: (error) => new CacheDeleteError({ cause: error }),
        }),
    );
    return {
      put,
      match,
      delete: delete_,
    } as const;
  }),
}) {
  public static readonly layer = this.make.pipe(Layer.effect(this));
}
