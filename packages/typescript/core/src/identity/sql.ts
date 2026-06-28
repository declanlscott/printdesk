import { text, uniqueIndex } from "drizzle-orm/pg-core";

import { Columns } from "../columns";
import { Tables } from "../tables";
import { IdentityProvidersContract } from "./contract";

import type { InferSelectModel } from "drizzle-orm";

export const identityProviders = new Tables.NonSync(
  "identity_providers",
  {
    kind: Columns.union(IdentityProvidersContract.Kind.literals).notNull(),
    externalTenantId: text().$type<IdentityProvidersContract.ExternalTenantId>().notNull(),
  },
  (table) => [
    uniqueIndex().on(table.kind, table.tenantId),
    uniqueIndex().on(table.externalTenantId, table.tenantId),
  ],
);
export const identityProvidersTable = identityProviders.table;
export type IdentityProvidersTable = typeof identityProvidersTable;
export type IdentityProvider = InferSelectModel<IdentityProvidersTable>;
