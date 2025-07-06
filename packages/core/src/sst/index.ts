import { Context, Data, Effect, Layer } from "effect";
import { Resource as _Resource } from "sst";

export namespace Sst {
  export class ResourceError extends Data.TaggedError(
    "@printdesk/core/sst/ResourceError",
  )<{ readonly cause: globalThis.Error }> {}

  export class Resource extends Context.Tag("@printdesk/core/sst/Resource")<
    Sst.Resource,
    {
      readonly [TKey in keyof _Resource]: Effect.Effect<
        _Resource[TKey],
        Sst.ResourceError
      >;
    }
  >() {}

  const resource = Sst.Resource.of(
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
        }).pipe(Effect.withSpan("Sst.Resource.get", { attributes: { key } })),
    }),
  );

  export const ResourceLive = Layer.succeed(Sst.Resource, resource);
}
