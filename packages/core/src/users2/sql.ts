import { isNull } from "drizzle-orm";
import { index, pgView, text, unique, uniqueIndex } from "drizzle-orm/pg-core";

import { pgEnum, tenantTable } from "../database2/constructors";
import { UsersContract } from "./contract";

import type { DatabaseContract } from "../database2/contract";
import type { Discriminate } from "../utils/types";

export const usersTable = tenantTable(
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
export type UsersTable = typeof usersTable;
export type User = DatabaseContract.InferFromTable<UsersTable>;
export type UserByOrigin<TUserOrigin extends User["origin"]> = Discriminate<
  User,
  "origin",
  TUserOrigin
>;

export const activeUsersView = pgView(UsersContract.activeViewName).as((qb) =>
  qb.select().from(usersTable).where(isNull(usersTable.deletedAt)),
);
export type ActiveUsersView = typeof activeUsersView;
export type ActiveUser = DatabaseContract.InferFromView<ActiveUsersView>;
