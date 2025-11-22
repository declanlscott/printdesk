import { isNull } from "drizzle-orm";
import { index, pgView, text, unique, uniqueIndex } from "drizzle-orm/pg-core";

import { Columns } from "../columns2";
import { Tables } from "../tables2";
import { UsersContract } from "./contract";

import type { InferSelectModel, InferSelectViewModel } from "drizzle-orm";
import type { Discriminate } from "../utils/types";

export namespace UsersSchema {
  export const table = new Tables.Sync(
    UsersContract.tableName,
    {
      origin: Columns.union(UsersContract.origins).notNull(),
      username: text().notNull(),
      externalId: text().notNull(),
      identityProviderId: Columns.entityId.notNull(),
      role: Columns.union(UsersContract.roles).notNull().default("customer"),
      name: text().notNull(),
      email: text().notNull(),
    },
    (table) => [
      uniqueIndex().on(table.origin, table.username, table.tenantId),
      unique().on(table.externalId, table.tenantId),
      unique().on(table.email, table.tenantId),
      index().on(table.externalId),
      index().on(table.identityProviderId),
      index().on(table.role),
    ],
  );
  export type Table = typeof table.definition;
  export type Row = InferSelectModel<Table>;
  export type RowByOrigin<TUserOrigin extends Row["origin"]> = Discriminate<
    Row,
    "origin",
    TUserOrigin
  >;

  export const activeView = pgView(UsersContract.activeViewName).as((qb) =>
    qb
      .select()
      .from(table.definition)
      .where(isNull(table.definition.deletedAt)),
  );
  export type ActiveView = typeof activeView;
  export type ActiveRow = InferSelectViewModel<ActiveView>;
}
