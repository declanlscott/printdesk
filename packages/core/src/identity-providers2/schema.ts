import { pgTable, primaryKey, text, uniqueIndex } from "drizzle-orm/pg-core";

import { pgEnum, tenantId, timestamps } from "../database2/constructors";
import {
  IdentityProviderGroupsContract,
  IdentityProvidersContract,
} from "./contract";

import type { InferSelectModel } from "drizzle-orm";
import type { TableContract } from "../database2/contract";

export namespace IdentityProvidersSchema {
  export const table = pgTable(
    IdentityProvidersContract.tableName,
    {
      id: text("id").notNull(),
      tenantId,
      kind: pgEnum("kind", IdentityProvidersContract.kinds).notNull(),
      ...timestamps,
    },
    (table) => [
      primaryKey({ columns: [table.id, table.tenantId] }),
      uniqueIndex().on(table.id),
    ],
  );

  export type Table = typeof table;
  export type Row = InferSelectModel<Table>;
}

export namespace IdentityProviderUserGroupsSchema {
  export const table = pgTable(
    IdentityProviderGroupsContract.tableName,
    {
      id: text("group_id").notNull(),
      identityProviderId: text("identity_provider_id").notNull(),
      tenantId,
    },
    (table) => [
      primaryKey({
        columns: [table.id, table.identityProviderId, table.tenantId],
      }),
    ],
  );

  export type Table = typeof table;
  export type Row = TableContract.InferDataTransferObject<Table>;
}
