import { App } from "@printdesk/core/app";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Struct from "effect/Struct";

import { SstResource } from "./sst";

export const appLayer = SstResource.useSync(Struct.get("App")).pipe(
  Effect.map(Redacted.value),
  Layer.effect(App),
  Layer.provide(SstResource.layer),
);
