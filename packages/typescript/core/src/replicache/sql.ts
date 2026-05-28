import { bigint, index, primaryKey, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import * as Schema from "effect/Schema";

import { Columns } from "../columns";
import { Tables } from "../tables";
import { ReplicacheClientViewEntriesModel } from "./models";

import type { InferSelectModel } from "drizzle-orm";
import type { ReplicacheContract } from "./contracts";

const clientGroupId = () => uuid().$type<ReplicacheContract.ClientGroupId>();

export const replicacheMeta = new Tables.Table("replicache_meta", {
  key: text().primaryKey(),
  value: Columns.jsonb(Schema.Any).notNull(),
});
export const replicacheMetaTable = replicacheMeta.table;
export type ReplicacheMetaTable = typeof replicacheMetaTable;
export type ReplicacheMeta = InferSelectModel<ReplicacheMetaTable>;

export const replicacheClientGroups = new Tables.Table(
  "replicache_client_groups",
  {
    id: clientGroupId().notNull(),
    tenantId: Columns.tenantId(),
    userId: Columns.entityId().notNull(),
    clientVersion: Columns.version().notNull(),
    clientViewVersion: Columns.version(), // null until first pull initializes it
    ...Columns.timestamps,
  },
  (table) => [primaryKey({ columns: [table.id, table.tenantId] }), index().on(table.updatedAt)],
);
export const replicacheClientGroupsTable = replicacheClientGroups.table;
export type ReplicacheClientGroupsTable = typeof replicacheClientGroupsTable;
export type ReplicacheClientGroup = InferSelectModel<ReplicacheClientGroupsTable>;

export const replicacheClients = new Tables.Table(
  "replicache_clients",
  {
    id: uuid().notNull(),
    tenantId: Columns.tenantId(),
    clientGroupId: clientGroupId().notNull(),
    lastMutationId: bigint({ mode: "number" }).notNull().default(0),
    version: Columns.version().notNull(),
    ...Columns.timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.id, table.tenantId] }),
    index().on(table.clientGroupId),
    index().on(table.updatedAt),
  ],
);
export const replicacheClientsTable = replicacheClients.table;
export type ReplicacheClientsTable = typeof replicacheClientsTable;
export type ReplicacheClient = InferSelectModel<ReplicacheClientsTable>;

export const replicacheClientViews = new Tables.Table(
  "replicache_client_views",
  {
    clientGroupId: clientGroupId().notNull(),
    version: Columns.version().notNull(),
    clientVersion: Columns.version().notNull(),
    tenantId: Columns.tenantId(),
  },
  (table) => [
    primaryKey({
      columns: [table.clientGroupId, table.version, table.tenantId],
    }),
  ],
);
export const replicacheClientViewsTable = replicacheClientViews.table;
export type ReplicacheClientViewsTable = typeof replicacheClientViewsTable;
export type ReplicacheClientView = InferSelectModel<ReplicacheClientViewsTable>;

export const replicacheClientViewEntries = new Tables.Table(
  "replicache_client_view_entries",
  {
    clientGroupId: clientGroupId().notNull(),
    clientViewVersion: Columns.version().notNull(),
    entity: Columns.union(ReplicacheClientViewEntriesModel.entities).notNull(),
    entityId: Columns.entityId().notNull(),
    entityVersion: Columns.version(),
    tenantId: Columns.tenantId(),
  },
  (table) => [
    primaryKey({ columns: [table.clientGroupId, table.entity, table.entityId, table.tenantId] }),
    uniqueIndex().on(
      table.clientGroupId,
      table.clientViewVersion,
      table.entity,
      table.entityId,
      table.entityVersion,
      table.tenantId,
    ),
  ],
);
export const replicacheClientViewEntriesTable = replicacheClientViewEntries.table;
export type ReplicacheClientViewEntriesTable = typeof replicacheClientViewEntriesTable;
export type ReplicacheClientViewEntry = InferSelectModel<ReplicacheClientViewEntriesTable>;
