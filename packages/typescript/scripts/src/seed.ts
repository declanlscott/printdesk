import { Drizzle } from "@printdesk/core/database/drizzle";
import * as PgClient from "@printdesk/core/database/postgres";
import { replicacheMetaTable } from "@printdesk/core/replicache/sql";
import { SstResource } from "@printdesk/core/sst/resource";
import { Constants } from "@printdesk/core/utils/constants";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

const seed = Drizzle.pipe(
  Effect.flatMap((db) =>
    db
      .insert(replicacheMetaTable)
      .values({ key: "schemaVersion", value: Constants.DB_SCHEMA_VERSION }),
  ),
  Effect.tap(() => Effect.logInfo("✅ Seeding complete!")),
  Effect.tapCause((cause) => Effect.logError("❌ Error during seeding", cause)),
);

seed.pipe(
  Effect.provide(
    Drizzle.layerWithDrizzleServices.pipe(
      Layer.provide(PgClient.layer),
      Layer.provide(SstResource.layer),
    ),
  ),
  Effect.runFork,
);
