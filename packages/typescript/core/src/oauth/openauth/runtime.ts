import * as ManagedRuntime from "effect/ManagedRuntime";

import { layer } from "./layer";

export const runtime = (...args: Parameters<typeof layer>) =>
  layer(...args).pipe(ManagedRuntime.make);
