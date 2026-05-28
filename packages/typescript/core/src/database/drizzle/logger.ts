import { EffectLogger } from "drizzle-orm/effect-core";
import { DefaultLogger } from "drizzle-orm/logger";
import * as Layer from "effect/Layer";

export const makeService = EffectLogger.fromDrizzle(new DefaultLogger());

export const layer = Layer.succeed(EffectLogger, makeService);
