import { NoopCache } from "drizzle-orm/cache/core/cache";
import { EffectCache } from "drizzle-orm/cache/core/cache-effect";
import * as Layer from "effect/Layer";

export const makeService = EffectCache.fromDrizzle(new NoopCache());

export const layer = Layer.succeed(EffectCache, makeService);
