import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Struct from "effect/Struct";

import { Cloudflare } from ".";
import { SstResource } from "../sst/resource";

export const makeService = Effect.gen(function* () {
  const cloudflare = yield* SstResource.useSync(Struct.get("Cloudflare")).pipe(
    Effect.map(Redacted.value),
  );

  return {
    account: cloudflare.account,
    apiToken: Redacted.make(cloudflare.apiToken),
  };
});

export const layer = makeService.pipe(Layer.effect(Cloudflare));
