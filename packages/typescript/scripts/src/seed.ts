import { nodeCredentialIdentityProviderLayer } from "@printdesk/core/aws/credential-identity/node";
import * as DsqlSigner from "@printdesk/core/aws/dsql-signer/layer";
import { Drizzle } from "@printdesk/core/database/drizzle";
import * as PgClient from "@printdesk/core/database/pg-client";
import { replicacheMetaTable } from "@printdesk/core/replicache/sql";
import { SstResource } from "@printdesk/core/sst/resource";
import { Constants } from "@printdesk/core/utils/constants";
import * as Duration from "effect/Duration";
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
  Effect.asVoid,
);

seed.pipe(
  // oxlint-disable-next-line effecttsgo/strict-effect-provide
  Effect.provide(
    Drizzle.layerWithDrizzleServices.pipe(
      Layer.provide(PgClient.layer),
      Layer.provide(DsqlSigner.layer({ expiresIn: Duration.minutes(15) })),
      Layer.provide(nodeCredentialIdentityProviderLayer),
      Layer.provide(SstResource.layer),
    ),
  ),
  Effect.runFork,
);
