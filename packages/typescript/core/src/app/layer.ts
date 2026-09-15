import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Struct from "effect/Struct";

import { App } from ".";
import { SstResource } from "../sst/resource";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = SstResource.useSync(Struct.get("App")).pipe(Effect.map(Redacted.value));

export const layer = makeService.pipe(Layer.effect(App));
