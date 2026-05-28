import { LambdaHandler } from "@effect-aws/lambda";
import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import { Drizzle } from "@printdesk/core/database/drizzle";
import { Migrator } from "@printdesk/core/database/migrator";
import * as PgClient from "@printdesk/core/database/postgres";
import { SstResource } from "@printdesk/core/sst/resource";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Struct from "effect/Struct";

export const handler = LambdaHandler.make({
  layer: Migrator.layer.pipe(
    Layer.provide(Drizzle.layerWithDrizzleServices),
    Layer.provide(PgClient.layer),
    Layer.provide(SstResource.layer),
    Layer.provide(NodeCrypto.layer),
  ),
  handler: () =>
    Migrator.use(Struct.get("migrate")).pipe(
      Effect.tap(() => Effect.logInfo("✅ Migration complete!")),
      Effect.tapCause((cause) => Effect.logError(`❌ Error during migration:`, cause)),
      Effect.map(() => ({ success: true })),
      Effect.orElseSucceed(() => ({ success: false })),
    ),
});
