import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";
import { Resource as _Resource } from "sst";

export namespace Sst {
  export class Resource extends Effect.Service<Resource>()(
    "@printdesk/core/sst/Resource",
    {
      accessors: true,
      succeed: new Proxy(
        {},
        {
          get: (_, key: keyof _Resource) => Redacted.make(_Resource[key]),
          getOwnPropertyDescriptor: () => ({
            configurable: true,
            enumerable: true,
          }),
          ownKeys: () => Object.keys(_Resource),
        },
      ) as {
        readonly [TKey in keyof _Resource]: Redacted.Redacted<_Resource[TKey]>;
      },
    },
  ) {}
}
