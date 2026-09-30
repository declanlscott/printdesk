import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as ManagedRuntime from "effect/ManagedRuntime";

import { layer } from "./layer";

export const runtime = (...args: Parameters<typeof layer>) =>
  layer(...args).pipe(Layer.tapCause(Effect.logError), ManagedRuntime.make);
