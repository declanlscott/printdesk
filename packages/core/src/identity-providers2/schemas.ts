import { text, uniqueIndex } from "drizzle-orm/pg-core";

import { Columns } from "../columns2";
import { Tables } from "../tables2";
import {
  IdentityProvidersContract,
  IdentityProviderUserGroupsContract,
} from "./contracts";

import type { InferSelectModel } from "drizzle-orm";

export namespace IdentityProvidersSchema {
  export const table = new Tables.NonSync(
    IdentityProvidersContract.tableName,
    {
      kind: Columns.union(IdentityProvidersContract.kinds).notNull(),
      externalId: text().notNull(),
      ...Columns.timestamps,
    },
    (table) => [uniqueIndex().on(table.kind, table.externalId, table.tenantId)],
  );

  export type Table = typeof table.definition;
  export type Row = InferSelectModel<Table>;
}

export namespace IdentityProviderUserGroupsSchema {
  export const table = new Tables.NonSync(
    IdentityProviderUserGroupsContract.tableName,
    {
      externalId: text().notNull(),
      identityProviderId: Columns.entityId.notNull(),
    },
    (table) => [
      uniqueIndex().on(
        table.identityProviderId,
        table.externalId,
        table.tenantId,
      ),
    ],
  );

  export type Table = typeof table.definition;
  export type Row = InferSelectModel<Table>;
}
