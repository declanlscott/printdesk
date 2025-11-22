import { isNull } from "drizzle-orm";
import { index, pgView, text, unique, uniqueIndex } from "drizzle-orm/pg-core";

import { Columns } from "../columns2";
import { Tables } from "../tables2";
import { GroupsContract } from "./contract";

import type { InferSelectModel, InferSelectViewModel } from "drizzle-orm";

export namespace GroupsSchema {
  export const table = new Tables.Sync(
    GroupsContract.tableName,
    {
      name: text().notNull(),
      externalId: text().notNull(),
      identityProviderId: Columns.entityId.notNull(),
    },
    (table) => [
      uniqueIndex().on(table.name, table.tenantId),
      unique().on(table.externalId, table.tenantId),
      index().on(table.externalId),
      index().on(table.identityProviderId),
    ],
  );
  export type Table = typeof table.definition;
  export type Row = InferSelectModel<Table>;

  export const activeView = pgView(GroupsContract.activeViewName).as((qb) =>
    qb
      .select()
      .from(table.definition)
      .where(isNull(table.definition.deletedAt)),
  );
  export type ActiveView = typeof activeView;
  export type ActiveRow = InferSelectViewModel<ActiveView>;
}
