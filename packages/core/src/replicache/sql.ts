import {
  bigint,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  uuid,
} from "drizzle-orm/pg-core";

import { customJsonb, id, timestamps } from "../database/columns";
import { tenantIdColumns } from "../database/tables";
import {
  replicacheClientGroupsTableName,
  replicacheClientsTableName,
  replicacheClientViewsTableName,
  replicacheMetaTableName,
} from "./shared";

import type { InferSelectModel } from "drizzle-orm";
import type { ClientViewRecord } from "./client-view-record";

export const replicacheMetaTable = pgTable(replicacheMetaTableName, {
  key: text("key").primaryKey(),
  value: customJsonb("value").notNull(),
});
export type ReplicacheMetaTable = typeof replicacheMetaTable;
export type ReplicacheMeta = InferSelectModel<ReplicacheMetaTable>;

export const replicacheClientGroupsTable = pgTable(
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
);
export type ReplicacheClientGroupsTable = typeof replicacheClientGroupsTable;
export type ReplicacheClientGroup =
  InferSelectModel<ReplicacheClientGroupsTable>;

export const replicacheClientsTable = pgTable(
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
);
export type ReplicacheClientsTable = typeof replicacheClientsTable;
export type ReplicacheClient = InferSelectModel<ReplicacheClientsTable>;

export const replicacheClientViewsTable = pgTable(
  replicacheClientViewsTableName,
  {
    tenantId: tenantIdColumns.tenantId,
    clientGroupId: uuid("client_group_id").notNull(),
    version: integer("version").notNull(),
    record: customJsonb<undefined, ClientViewRecord>("record").notNull(),
    ...timestamps,
  },
  (table) => [
    primaryKey({
      columns: [table.clientGroupId, table.version, table.tenantId],
    }),
    index().on(table.updatedAt),
  ],
);
export type ReplicacheClientViewsTable = typeof replicacheClientViewsTable;
export type ReplicacheClientView = InferSelectModel<ReplicacheClientViewsTable>;
