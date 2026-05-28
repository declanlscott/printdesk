import * as PgDrizzle from "drizzle-orm/effect-postgres";
import * as Context from "effect/Context";
import * as Layer from "effect/Layer";

import * as DrizzleCache from "./cache";
import * as DrizzleLogger from "./logger";

export class Drizzle extends Context.Service<Drizzle>()("@printdesk/core/database/Drizzle", {
  make: PgDrizzle.make(),
}) {
  public static readonly layer = this.make.pipe(Layer.effect(this));

  public static readonly layerWithDrizzleServices = this.layer.pipe(
    Layer.provide([DrizzleLogger.layer, DrizzleCache.layer]),
  );
}
