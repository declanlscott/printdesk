import { isNull } from "drizzle-orm";
import { index, snakeCase, text, unique } from "drizzle-orm/pg-core";

import { Columns } from "../columns";
import { Tables } from "../tables";
import { UsersContract } from "./contract";

import type { InferSelectModel, InferSelectViewModel } from "drizzle-orm";
import type { Discriminate } from "../utils";

export const users = new Tables.Sync(
  "users",
  {
    origin: Columns.union(UsersContract.Origin.literals).notNull(),
    username: text().$type<UsersContract.Username>().notNull(),
    externalId: text().$type<UsersContract.ExternalId>().notNull(),
    identityProviderId: Columns.entityId().notNull(),
    role: Columns.union(UsersContract.Role.literals).notNull().default("customer"),
    displayName: text().$type<UsersContract.DisplayName>().notNull(),
    email: text().$type<UsersContract.Email>().notNull(),
  },
  (table) => [
    unique().on(table.username, table.tenantId),
    unique().on(table.externalId, table.tenantId),
    unique().on(table.email, table.tenantId),
    index().on(table.origin, table.tenantId),
    index().on(table.externalId),
    index().on(table.identityProviderId),
  ],
);
export const usersTable = users.table;
export type UsersTable = typeof usersTable;
export type User = InferSelectModel<UsersTable>;
export type UserByOrigin<TUserOrigin extends User["origin"]> = Discriminate<
  User,
  "origin",
  TUserOrigin
>;

export const activeUsersView = snakeCase
  .view(`active_${users.name}`)
  .as((qb) => qb.select().from(usersTable).where(isNull(usersTable.deletedAt)));
export type ActiveUsersView = typeof activeUsersView;
export type ActiveUser = InferSelectViewModel<ActiveUsersView>;
