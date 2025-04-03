import { pgTable, primaryKey, text } from "drizzle-orm/pg-core";

import { customEnum, id, timestamps } from "../drizzle/columns";
import { oauth2ProviderKinds, oauth2ProvidersTableName } from "./shared";

import type { InferTable } from "../drizzle/tables";

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
  (table) => [primaryKey({ columns: [table.id, table.tenantId] })],
);

export type Oauth2ProvidersTable = typeof oauth2ProvidersTable;

export type Oauth2Provider = InferTable<Oauth2ProvidersTable>;
