import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import { Resource as SstResource } from "sst";

import type { Context } from "effect";

export namespace Sst {
  export class Resource extends Effect.Tag("@printdesk/core/sst/Resource")<
    Sst.Resource,
    {
      readonly [TKey in keyof SstResource]: Redacted.Redacted<
        SstResource[TKey]
      >;
    }
  >() {
    static readonly layer = Layer.succeed(
      this,
      new Proxy({} as Context.Tag.Service<Sst.Resource>, {
        get: (_, key: keyof SstResource) => Redacted.make(SstResource[key]),
      }),
    );
  }
}
