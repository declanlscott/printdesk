import { Database } from "@printdesk/core/database";
import { ReplicacheMetaSchema } from "@printdesk/core/replicache/schemas";
import { Sst } from "@printdesk/core/sst";
import { Constants } from "@printdesk/core/utils/constants";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

const seed = Effect.gen(function* () {
  const db = yield* Database.Database;

  yield* Effect.tryPromise(() =>
    db.client
      .insert(ReplicacheMetaSchema.table.definition)
      .values({ key: "schemaVersion", value: Constants.DB_SCHEMA_VERSION }),
  ).pipe(
    Effect.tapBoth({
      onFailure: (error) => Effect.logError("❌ Error during seeding", error),
      onSuccess: () => Effect.logInfo("✅ Seeding complete!"),
    }),
  );
});

void seed.pipe(
  Effect.provide(
    Database.Database.Default.pipe(Layer.provide(Sst.Resource.Default)),
  ),
  Effect.runFork,
);
