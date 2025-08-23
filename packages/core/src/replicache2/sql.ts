import {
  bigint,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { Schema } from "effect";

import {
  id,
  jsonb,
  pgEnum,
  tenantId,
  timestamps,
} from "../database2/constructors";
import {
  ReplicacheClientGroupsContract,
  ReplicacheClientsContract,
  ReplicacheClientViewMetadataContract,
  ReplicacheClientViewsContract,
  ReplicacheMetaContract,
} from "./contracts";

import type { InferSelectModel } from "drizzle-orm";
import type { TableContract } from "../database2/contract";

export const replicacheMetaTable = pgTable(ReplicacheMetaContract.tableName, {
  key: text("key").primaryKey(),
  value: jsonb("value", Schema.Any).notNull(),
});
export type ReplicacheMetaTable = typeof replicacheMetaTable;
export type ReplicacheMeta = InferSelectModel<ReplicacheMetaTable>;

export const replicacheClientGroupsTable = pgTable(
  ReplicacheClientGroupsContract.tableName,
  {
    id: uuid("id").notNull(),
    tenantId,
    userId: id<TableContract.EntityId>("user_id").notNull(),
    clientVersion: integer("client_version")
      .$type<TableContract.Version>()
      .notNull(),
    // null until first pull initializes it
    clientViewVersion: integer(
      "client_view_version",
    ).$type<TableContract.Version>(),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.id, table.tenantId] }),
    index().on(table.updatedAt),
  ],
);
export type ReplicacheClientGroupsTable = typeof replicacheClientGroupsTable;
export type ReplicacheClientGroup =
  InferSelectModel<ReplicacheClientGroupsTable>;

export const replicacheClientsTable = pgTable(
  ReplicacheClientsContract.tableName,
  {
    id: uuid("id").notNull(),
    tenantId,
    clientGroupId: uuid("client_group_id").notNull(),
    lastMutationId: bigint("last_mutation_id", { mode: "number" })
      .notNull()
      .default(0),
    version: integer("version").$type<TableContract.Version>().notNull(),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.id, table.tenantId] }),
    index().on(table.clientGroupId),
    index().on(table.updatedAt),
  ],
);
export type ReplicacheClientsTable = typeof replicacheClientsTable;
export type ReplicacheClient = InferSelectModel<ReplicacheClientsTable>;

export const replicacheClientViewsTable = pgTable(
  ReplicacheClientViewsContract.tableName,
  {
    clientGroupId: uuid("client_group_id").notNull(),
    version: integer("version").notNull(),
    clientVersion: integer("client_version")
      .$type<TableContract.Version>()
      .notNull(),
    tenantId,
  },
  (table) => [
    primaryKey({
      columns: [table.clientGroupId, table.version, table.tenantId],
    }),
  ],
);
export type ReplicacheClientViewsTable = typeof replicacheClientViewsTable;
export type ReplicacheClientView = InferSelectModel<ReplicacheClientViewsTable>;

export const replicacheClientViewMetadataTable = pgTable(
  ReplicacheClientViewMetadataContract.tableName,
  {
    clientGroupId: uuid("client_group_id").notNull(),
    clientViewVersion: integer("client_view_version")
      .$type<TableContract.Version>()
      .notNull(),
    entity: pgEnum(
      "entity",
      ReplicacheClientViewMetadataContract.entities,
    ).notNull(),
    entityId: id("entity_id").$type<TableContract.EntityId>().notNull(),
    entityVersion: integer("entity_version").$type<TableContract.Version>(),
    tenantId,
  },
  (table) => [
    primaryKey({
      columns: [
        table.clientGroupId,
        table.entity,
        table.entityId,
        table.tenantId,
      ],
    }),
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
export type ReplicacheClientViewMetadataTable =
  typeof replicacheClientViewMetadataTable;
export type ReplicacheClientViewMetadata =
  InferSelectModel<ReplicacheClientViewMetadataTable>;
