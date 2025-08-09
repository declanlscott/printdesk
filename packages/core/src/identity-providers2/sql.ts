import { pgTable, primaryKey, text, uniqueIndex } from "drizzle-orm/pg-core";

import { id, pgEnum, timestamps } from "../database2/constructors";
import {
  IdentityProviderGroupsContract,
  IdentityProvidersContract,
} from "./contract";

import type { DatabaseContract } from "../database2/contract";

export const identityProvidersTable = pgTable(
  IdentityProvidersContract.tableName,
  {
    id: text("id").notNull(),
    tenantId: id("tenant_id").notNull(),
    kind: pgEnum("kind", IdentityProvidersContract.kinds).notNull(),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.id, table.tenantId] }),
    uniqueIndex().on(table.id),
  ],
);
export type IdentityProvidersTable = typeof identityProvidersTable;
export type IdentityProvider =
  DatabaseContract.InferFromTable<IdentityProvidersTable>;

export const identityProviderUserGroupsTable = pgTable(
  IdentityProviderGroupsContract.tableName,
  {
    id: text("group_id").notNull(),
    identityProviderId: text("identity_provider_id").notNull(),
    tenantId: id("tenant_id").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.id, table.identityProviderId, table.tenantId],
    }),
  ],
);
export type IdentityProviderUserGroupsTable =
  typeof identityProviderUserGroupsTable;
export type IdentityProviderUserGroup =
  DatabaseContract.InferFromTable<IdentityProviderUserGroupsTable>;
