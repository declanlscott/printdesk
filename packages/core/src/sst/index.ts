import { Effect, Layer, ManagedRuntime } from "effect";
import { Resource as SstResource } from "sst";

import type { Context } from "effect";

export namespace Sst {
  export class Resource extends Effect.Tag("@printdesk/core/sst/Resource")<
    Sst.Resource,
    { readonly [TKey in keyof SstResource]: Effect.Effect<SstResource[TKey]> }
  >() {
    static layer = Layer.succeed(
      this,
      new Proxy({} as Context.Tag.Service<Sst.Resource>, {
        get: (_, key: keyof SstResource) =>
          Effect.succeed(SstResource[key]).pipe(
            Effect.withSpan(`Sst.Resource.${key}`),
          ),
      }),
    );
  }

  export const runtime = ManagedRuntime.make(Sst.Resource.layer);
}
