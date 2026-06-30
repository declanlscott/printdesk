import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import { Drizzle } from "@printdesk/core/database/drizzle";
import { Migrator } from "@printdesk/core/database/migrator";
import * as PgClient from "@printdesk/core/database/postgres";
import { SstResource } from "@printdesk/core/sst/resource";
import * as Layer from "effect/Layer";

export const layer = Migrator.layer.pipe(
  Layer.provide(Drizzle.layerWithDrizzleServices),
  Layer.provide(PgClient.layer),
  Layer.provide(SstResource.layer),
  Layer.provide(NodeCrypto.layer),
);
