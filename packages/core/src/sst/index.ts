import { Data, Effect, Layer } from "effect";
import { Resource as _Resource } from "sst";

import type { Context } from "effect";

export namespace Sst {
  export class ResourceError extends Data.TaggedError(
    "@printdesk/core/sst/ResourceError",
  )<{ readonly cause: globalThis.Error }> {}

  export class Resource extends Effect.Tag("@printdesk/core/sst/Resource")<
    Sst.Resource,
    {
      readonly [TKey in keyof _Resource]: Effect.Effect<
        _Resource[TKey],
        Sst.ResourceError
      >;
    }
  >() {
    static live = Layer.succeed(
      this,
      new Proxy({} as Context.Tag.Service<Sst.Resource>, {
        get: (_, key: keyof _Resource) =>
          Effect.try({
            try: () => _Resource[key],
            catch: (cause) =>
              new Sst.ResourceError({
                cause:
                  cause instanceof Error
                    ? cause
                    : new Error("Unknown error", { cause }),
              }),
          }).pipe(Effect.withSpan(`Sst.Resource.${key}`)),
      }),
    );
  }
}
