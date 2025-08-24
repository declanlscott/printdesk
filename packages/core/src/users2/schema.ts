import { isNull } from "drizzle-orm";
import { index, pgView, text, unique, uniqueIndex } from "drizzle-orm/pg-core";

import { pgEnum, tenantTable } from "../database2/constructors";
import { UsersContract } from "./contract";

import type { InferSelectModel, InferSelectViewModel } from "drizzle-orm";
import type { Discriminate } from "../utils/types";

export namespace UsersSchema {
  export const table = tenantTable(
    UsersContract.tableName,
    {
      origin: pgEnum("origin", UsersContract.origins).notNull(),
      username: text("username").notNull(),
      subjectId: text("subject_id").notNull(),
      identityProviderId: text("identity_provider_id").notNull(),
      role: pgEnum("role", UsersContract.roles).notNull().default("customer"),
      name: text("name").notNull(),
      email: text("email").notNull(),
    },
    (table) => [
      uniqueIndex().on(table.origin, table.username, table.tenantId),
      unique().on(table.subjectId, table.tenantId),
      unique().on(table.email, table.tenantId),
      index().on(table.subjectId),
      index().on(table.identityProviderId),
      index().on(table.role),
    ],
  );
  export type Table = typeof table;
  export type Row = InferSelectModel<Table>;
  export type RowByOrigin<TUserOrigin extends Row["origin"]> = Discriminate<
    Row,
    "origin",
    TUserOrigin
  >;

  export const activeView = pgView(UsersContract.activeViewName).as((qb) =>
    qb.select().from(table).where(isNull(table.deletedAt)),
  );
  export type ActiveView = typeof activeView;
  export type ActiveRow = InferSelectViewModel<ActiveView>;
}
