import { pgTable, primaryKey, text, uniqueIndex } from "drizzle-orm/pg-core";

import { id, pgEnum, timestamps } from "../database2/constructors";
import {
  identityProviderKinds,
  identityProvidersTableName,
  identityProviderUserGroupsTableName,
} from "./shared";

import type { InferFromTable } from "../database2/shared";

export const identityProvidersTable = pgTable(
  identityProvidersTableName,
  {
    id: text("id").notNull(),
    tenantId: id("tenant_id").notNull(),
    kind: pgEnum("kind", identityProviderKinds).notNull(),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.id, table.tenantId] }),
    uniqueIndex().on(table.id),
  ],
);
export type IdentityProvidersTable = typeof identityProvidersTable;
export type IdentityProvider = InferFromTable<IdentityProvidersTable>;

export const identityProviderUserGroupsTable = pgTable(
  identityProviderUserGroupsTableName,
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
  InferFromTable<IdentityProviderUserGroupsTable>;
