import { text, uniqueIndex } from "drizzle-orm/pg-core";

import { Columns } from "../columns2";
import { Tables } from "../tables2";
import { IdentityProvidersContract } from "./contract";

import type { InferSelectModel } from "drizzle-orm";

export namespace IdentityProvidersSchema {
  export const table = new Tables.NonSync(
    IdentityProvidersContract.tableName,
    {
      kind: Columns.union(IdentityProvidersContract.kinds).notNull(),
      externalTenantId: text().notNull(),
      ...Columns.timestamps,
    },
    (table) => [uniqueIndex().on(table.kind, table.externalTenantId)],
  );

  export type Table = typeof table.definition;
  export type Row = InferSelectModel<Table>;
}
