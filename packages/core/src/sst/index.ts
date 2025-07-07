import { Effect, Layer } from "effect";
import { Resource as _Resource } from "sst";

import type { Context } from "effect";

export namespace Sst {
  export class Resource extends Effect.Tag("@printdesk/core/sst/Resource")<
    Sst.Resource,
    { readonly [TKey in keyof _Resource]: Effect.Effect<_Resource[TKey]> }
  >() {
    static live = Layer.succeed(
      this,
      new Proxy({} as Context.Tag.Service<Sst.Resource>, {
        get: (_, key: keyof _Resource) =>
          Effect.succeed(_Resource[key]).pipe(
            Effect.withSpan(`Sst.Resource.${key}`),
          ),
      }),
    );
  }
}
