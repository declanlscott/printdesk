import { Array, Record as EffectRecord, Schema } from "effect";

import { ColumnsContract } from "../columns2/contract";
import { Models } from "../models2";
import { TablesContract } from "../tables2/contract";

import type {
  ReplicacheClientGroupsSchema,
  ReplicacheClientsSchema,
  ReplicacheClientViewMetadataSchema,
  ReplicacheClientViewsSchema,
  ReplicacheMetaSchema,
} from "./schemas";

export namespace ReplicacheMetaModel {
  export class Record extends Schema.Class<Record>("Record")({
    key: Schema.String,
    value: Schema.Any,
  }) {}

  export const tableName = "replicache_meta";
  export const table =
    TablesContract.makeInternalTable<ReplicacheMetaSchema.Table>()(
      tableName,
      Record,
    );
}

export namespace ReplicacheClientGroupsModel {
  export class Record extends Schema.Class<Record>("Record")({
    id: Schema.UUID,
    tenantId: ColumnsContract.TenantId,
    userId: ColumnsContract.EntityId,
    clientVersion: ColumnsContract.Version.pipe(
      Schema.optionalWith({ default: () => ColumnsContract.Version.make(0) }),
    ),
    clientViewVersion: ColumnsContract.Version.pipe(
      Schema.NullOr,
      Schema.optionalWith({ default: () => null }),
    ),
    ...ColumnsContract.Timestamps.fields,
  }) {}

  export const tableName = "replicache_client_groups";
  export const table =
    TablesContract.makeInternalTable<ReplicacheClientGroupsSchema.Table>()(
      tableName,
      Record,
    );
}

export namespace ReplicacheClientsModel {
  export class Record extends Schema.Class<Record>("Record")({
    id: Schema.UUID,
    tenantId: ColumnsContract.TenantId,
    clientGroupId: Schema.UUID,
    lastMutationId: Schema.NonNegativeInt.pipe(
      Schema.optionalWith({ default: () => 0 }),
    ),
    version: ColumnsContract.Version.pipe(
      Schema.optionalWith({ default: () => ColumnsContract.Version.make(0) }),
    ),
    ...ColumnsContract.Timestamps.fields,
  }) {}

  export const tableName = "replicache_clients";
  export const table =
    TablesContract.makeInternalTable<ReplicacheClientsSchema.Table>()(
      tableName,
      Record,
    );
}

export namespace ReplicacheClientViewsModel {
  export class Record extends Schema.Class<Record>("Record")({
    clientGroupId: Schema.UUID,
    version: ColumnsContract.Version,
    clientVersion: ColumnsContract.Version,
    tenantId: ColumnsContract.TenantId,
  }) {}

  export const tableName = "replicache_client_views";
  export const table =
    TablesContract.makeInternalTable<ReplicacheClientViewsSchema.Table>()(
      tableName,
      Record,
    );
}

export namespace ReplicacheClientViewMetadataModel {
  export const entities = Array.map(
    EffectRecord.values(Models.syncTables),
    (table) => table.name,
  );
  export type Entity = (typeof entities)[number];

  export class Record extends Schema.Class<Record>("Record")({
    clientGroupId: Schema.UUID,
    clientViewVersion: ColumnsContract.Version,
    entity: Schema.Literal(...entities),
    entityId: ColumnsContract.EntityId,
    entityVersion: ColumnsContract.Version.pipe(Schema.NullOr),
    tenantId: ColumnsContract.TenantId,
  }) {}

  export const tableName = "replicache_client_view_metadata";
  export const table =
    TablesContract.makeInternalTable<ReplicacheClientViewMetadataSchema.Table>()(
      tableName,
      Record,
    );
}
