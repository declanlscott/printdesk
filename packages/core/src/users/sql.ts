import { index, text, unique, uniqueIndex } from "drizzle-orm/pg-core";

import { tenantTable } from "../drizzle/tables";
import { userRole, userType } from "../utils/sql";
import { usersTableName } from "./shared";

import type { Discriminate, InferTable } from "../utils/types";

export const usersTable = tenantTable(
  usersTableName,
  {
    type: userType("type").default("internal").notNull(),
    username: text("username").notNull(),
    oauth2UserId: text("oauth2_user_id").notNull(),
    oauth2ProviderId: text("oauth2_provider_id").notNull(),
    role: userRole("role").notNull().default("customer"),
    name: text("name").notNull(),
    email: text("email").notNull(),
  },
  (table) => [
    uniqueIndex().on(table.type, table.username, table.tenantId),
    unique().on(table.oauth2UserId, table.tenantId),
    unique().on(table.email, table.tenantId),
    index().on(table.oauth2UserId),
    index().on(table.oauth2ProviderId),
    index().on(table.role),
  ],
);

export type UsersTable = typeof usersTable;

export type User = InferTable<UsersTable>;
export type UserByType<TUserType extends User["type"]> = Discriminate<
  User,
  "type",
  TUserType
>;
