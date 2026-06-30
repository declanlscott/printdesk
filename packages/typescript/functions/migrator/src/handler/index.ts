import { Migrator } from "@printdesk/core/database/migrator";
import * as Effect from "effect/Effect";
import * as Struct from "effect/Struct";

export const handler = Effect.fn(() =>
  Migrator.use(Struct.get("migrate")).pipe(
    Effect.tap(() => Effect.logInfo("✅ Migration complete!")),
    Effect.tapCause((cause) => Effect.logError(`❌ Error during migration:`, cause)),
    Effect.map(() => ({ success: true })),
    Effect.orElseSucceed(() => ({ success: false })),
  ),
);
