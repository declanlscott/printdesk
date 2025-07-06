import { Context, Data, Effect, Layer } from "effect";
import { Resource as _Resource } from "sst";

export namespace Sst {
  export interface ResourceErrorShape {
    readonly cause: globalThis.Error;
  }

  export class ResourceError extends Data.TaggedError(
    "@printdesk/core/sst/ResourceError",
  )<Sst.ResourceErrorShape> {}

  export type ResourceShape = {
    readonly [TKey in keyof _Resource]: Effect.Effect<
      _Resource[TKey],
      Sst.ResourceError
    >;
  };

  export class Resource extends Context.Tag("@printdesk/core/sst/Resource")<
    Sst.Resource,
    Sst.ResourceShape
  >() {}

  export const ResourceImpl = Sst.Resource.of(
    new Proxy({} as Sst.ResourceShape, {
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
        }),
    }),
  );

  export const ResourceLive = Layer.succeed(Sst.Resource, Sst.ResourceImpl);
}
