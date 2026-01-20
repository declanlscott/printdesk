import * as Array from "effect/Array";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { ColumnsContract } from "../columns/contract";
import { Models } from "../models";
import { TablesContract } from "../tables/contract";

import type {
  ReplicacheClientGroupsSchema,
  ReplicacheClientsSchema,
  ReplicacheClientViewEntriesSchema,
  ReplicacheClientViewsSchema,
  ReplicacheMetaSchema,
} from "./schemas";

export namespace ReplicacheMetaModel {
  export class Table extends TablesContract.InternalTable<ReplicacheMetaSchema.Table>(
    "replicache_meta",
  )(
    class Record extends Schema.Class<Record>("ReplicacheMeta")({
      key: Schema.String,
      value: Schema.Any,
    }) {},
  ) {}
}

export namespace ReplicacheClientGroupsModel {
  export const Id = Schema.UUID.pipe(Schema.brand("ClientGroupId"));
  export type Id = typeof Id.Type;

  export class Table extends TablesContract.InternalTable<ReplicacheClientGroupsSchema.Table>(
    "replicache_client_groups",
  )(
    class Record extends Schema.Class<Record>("Record")({
      id: Id,
      tenantId: ColumnsContract.TenantId,
      userId: ColumnsContract.EntityId,
      clientVersion: ColumnsContract.Version.pipe(
        Schema.optionalWith({ default: () => ColumnsContract.Version.make(0) }),
      ),
      clientViewVersion: ColumnsContract.NullableVersion,
      ...ColumnsContract.Timestamps.fields,
    }) {},
  ) {}
}

export namespace ReplicacheClientsModel {
  export class Table extends TablesContract.InternalTable<ReplicacheClientsSchema.Table>(
    "replicache_clients",
  )(
    class Record extends Schema.Class<Record>("Record")({
      id: Schema.UUID,
      tenantId: ColumnsContract.TenantId,
      clientGroupId: ReplicacheClientGroupsModel.Id,
      lastMutationId: Schema.NonNegativeInt.pipe(
        Schema.optionalWith({ default: () => 0 }),
      ),
      version: ColumnsContract.Version.pipe(
        Schema.optionalWith({ default: () => ColumnsContract.Version.make(0) }),
      ),
      ...ColumnsContract.Timestamps.fields,
    }) {},
  ) {}
}

export namespace ReplicacheClientViewsModel {
  export class Table extends TablesContract.InternalTable<ReplicacheClientViewsSchema.Table>(
    "replicache_client_views",
  )(
    class Record extends Schema.Class<Record>("Record")({
      clientGroupId: ReplicacheClientGroupsModel.Id,
      version: ColumnsContract.Version.pipe(
        Schema.optionalWith({ default: () => ColumnsContract.Version.make(0) }),
      ),
      clientVersion: ColumnsContract.Version.pipe(
        Schema.optionalWith({ default: () => ColumnsContract.Version.make(0) }),
      ),
      tenantId: ColumnsContract.TenantId,
    }) {},
  ) {}
}

export namespace ReplicacheClientViewEntriesModel {
  export const entities = Array.map(Models.allSyncTables, Struct.get("name"));
  export type Entity = (typeof entities)[number];

  export class Table extends TablesContract.InternalTable<ReplicacheClientViewEntriesSchema.Table>(
    "replicache_client_view_entries",
  )(
    class Record extends Schema.Class<Record>("Record")({
      clientGroupId: ReplicacheClientGroupsModel.Id,
      clientViewVersion: ColumnsContract.Version,
      entity: Schema.Literal(...entities),
      entityId: ColumnsContract.EntityId,
      entityVersion: ColumnsContract.NullableVersion,
      tenantId: ColumnsContract.TenantId,
    }) {},
  ) {}
}
