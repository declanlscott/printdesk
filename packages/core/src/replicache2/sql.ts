import {
  bigint,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { Schema } from "effect";

import { tenantIdColumns } from "../database/tables";
import {
  customJsonb,
  id,
  NonSyncTable,
  timestamps,
} from "../database2/constructors";
import {
  replicacheClientGroupsTableName,
  replicacheClientsTableName,
  replicacheClientViewsTableName,
  replicacheMetaTableName,
} from "./shared";

import type { InferSelectModel } from "drizzle-orm";

export const replicacheMetaTable = NonSyncTable(
  pgTable(replicacheMetaTableName, {
    key: text("key").primaryKey(),
    value: customJsonb("value", Schema.Any).notNull(),
  }),
  [],
);
export type ReplicacheMetaTable = (typeof replicacheMetaTable)["table"];
export type ReplicacheMeta = InferSelectModel<ReplicacheMetaTable>;

export const replicacheClientGroupsTable = NonSyncTable(
  pgTable(
    replicacheClientGroupsTableName,
    {
      id: uuid("id").notNull(),
      tenantId: tenantIdColumns.tenantId,
      userId: id("user_id").notNull(),
      cvrVersion: integer("cvr_version").notNull(),
      ...timestamps,
    },
    (table) => [
      primaryKey({ columns: [table.id, table.tenantId] }),
      index().on(table.updatedAt),
    ],
  ),
  [],
);
export type ReplicacheClientGroupsTable =
  (typeof replicacheClientGroupsTable)["table"];
export type ReplicacheClientGroup =
  InferSelectModel<ReplicacheClientGroupsTable>;

export const replicacheClientsTable = NonSyncTable(
  pgTable(
    replicacheClientsTableName,
    {
      id: uuid("id").notNull(),
      tenantId: tenantIdColumns.tenantId,
      clientGroupId: uuid("client_group_id").notNull(),
      lastMutationId: bigint("last_mutation_id", { mode: "number" })
        .notNull()
        .default(0),
      ...timestamps,
    },
    (table) => [
      primaryKey({ columns: [table.id, table.tenantId] }),
      index().on(table.clientGroupId),
      index().on(table.updatedAt),
    ],
  ),
  [],
);
export type ReplicacheClientsTable = (typeof replicacheClientsTable)["table"];
export type ReplicacheClient = InferSelectModel<ReplicacheClientsTable>;

export const replicacheClientViewsTable = NonSyncTable(
  pgTable(
    replicacheClientViewsTableName,
    {
      tenantId: tenantIdColumns.tenantId,
      clientGroupId: uuid("client_group_id").notNull(),
      version: integer("version").notNull(),
      // TODO: Client view record schema
      record: customJsonb("record", Schema.Struct({})).notNull(),
      ...timestamps,
    },
    (table) => [
      primaryKey({
        columns: [table.clientGroupId, table.version, table.tenantId],
      }),
      index().on(table.updatedAt),
    ],
  ),
  [],
);
export type ReplicacheClientViewsTable =
  (typeof replicacheClientViewsTable)["table"];
export type ReplicacheClientView = InferSelectModel<ReplicacheClientViewsTable>;
