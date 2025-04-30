import { pgTable, primaryKey, text, uniqueIndex } from "drizzle-orm/pg-core";

import { customEnum, id, timestamps } from "../drizzle/columns";
import {
  oauth2ProviderKinds,
  oauth2ProvidersTableName,
  oauth2ProviderUserGroupsTableName,
} from "./shared";

import type { InferFromTable } from "../drizzle/tables";

export const oauth2ProviderKind = (name: string) =>
  customEnum(name, oauth2ProviderKinds);
export const oauth2ProvidersTable = pgTable(
  oauth2ProvidersTableName,
  {
    id: text("id").notNull(),
    tenantId: id("tenant_id").notNull(),
    kind: oauth2ProviderKind("kind").notNull(),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.id, table.tenantId] }),
    uniqueIndex().on(table.id),
  ],
);
export type Oauth2ProvidersTable = typeof oauth2ProvidersTable;
export type Oauth2Provider = InferFromTable<Oauth2ProvidersTable>;

export const oauth2ProviderUserGroupsTable = pgTable(
  oauth2ProviderUserGroupsTableName,
  {
    id: text("group_id").notNull(),
    oauth2ProviderId: text("oauth2_provider_id").notNull(),
    tenantId: id("tenant_id").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id, table.oauth2ProviderId, table.tenantId] }),
  ],
);
export type Oauth2ProviderUserGroupsTable =
  typeof oauth2ProviderUserGroupsTable;
export type Oauth2ProviderUserGroup =
  InferFromTable<Oauth2ProviderUserGroupsTable>;
