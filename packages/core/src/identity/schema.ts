import { text, uniqueIndex } from "drizzle-orm/pg-core";

import { Columns } from "../columns";
import { Tables } from "../tables";
import { IdentityProvidersContract } from "./contract";

import type { InferSelectModel } from "drizzle-orm";

export namespace IdentityProvidersSchema {
  export const table = new Tables.NonSync(
    "identity_providers",
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
