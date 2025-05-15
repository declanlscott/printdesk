import { index, text, unique, uniqueIndex } from "drizzle-orm/pg-core";

import { customEnum } from "../drizzle/columns";
import { tenantTable } from "../drizzle/tables";
import { userOrigins, userRoles, usersTableName } from "./shared";

import type { InferFromTable } from "../drizzle/tables";
import type { Discriminate } from "../utils/types";

export const userOrigin = (name: string) => customEnum(name, userOrigins);
export const userRole = (name: string) => customEnum(name, userRoles);

export const usersTable = tenantTable(
  usersTableName,
  {
    origin: userOrigin("origin").default("internal").notNull(),
    username: text("username").notNull(),
    subjectId: text("subject_id").notNull(),
    identityProviderId: text("identity_provider_id").notNull(),
    role: userRole("role").notNull().default("customer"),
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

export type User = InferFromTable<UsersTable>;
export type UserByOrigin<TUserOrigin extends User["origin"]> = Discriminate<
  User,
  "origin",
  TUserOrigin
>;
