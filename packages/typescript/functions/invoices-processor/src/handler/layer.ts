import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

export const layer = Layer.empty.pipe(Layer.tapCause(Effect.logError));
