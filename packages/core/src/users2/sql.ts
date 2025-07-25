import { isNull } from "drizzle-orm";
import { index, pgView, text, unique, uniqueIndex } from "drizzle-orm/pg-core";

import { customEnum, tenantTable } from "../database2/constructors";
import { userRoles } from "../users/shared";
import { activeUsersViewName, userOrigins, usersTableName } from "./shared";

import type { InferFromTable, InferFromView } from "../database2/shared";
import type { Discriminate } from "../utils/types";

const userOrigin = (name: string) => customEnum(name, userOrigins);
const userRole = (name: string) => customEnum(name, userRoles);

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

export const activeUsersView = pgView(activeUsersViewName).as((qb) =>
  qb.select().from(usersTable).where(isNull(usersTable.deletedAt)),
);
export type ActiveUsersView = typeof activeUsersView;
export type ActiveUser = InferFromView<ActiveUsersView>;
