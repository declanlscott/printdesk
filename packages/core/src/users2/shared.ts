import { Schema, Struct } from "effect";

import { DataAccess } from "../data-access2";
import { SyncTable, TenantTable, View } from "../database2/shared";
import { NanoId } from "../utils2/shared";

import type { ActiveUsersView, UsersTable } from "./sql";

export const userOrigins = ["papercut", "internal"] as const;
export type UserOrigin = (typeof userOrigins)[number];

export const userRoles = [
  "administrator",
  "operator",
  "manager",
  "customer",
] as const;
export type UserRole = (typeof userRoles)[number];

export const usersTableName = "users";
export const users = SyncTable<UsersTable>()(
  usersTableName,
  Schema.Struct({
    ...TenantTable.fields,
    origin: Schema.Literal(...userOrigins),
    username: Schema.String,
    subjectId: Schema.String,
    identityProviderId: Schema.String,
    role: Schema.Literal(...userRoles),
    name: Schema.String,
    email: Schema.String,
  }),
  ["read", "update", "delete"],
);
export const activeUsersViewName = `active_${usersTableName}`;
export const activeUsers = View<ActiveUsersView>()(
  activeUsersViewName,
  users.Schema,
);

export const isUserSelf = new DataAccess.Policy({
  name: "isUserSelf",
  Args: users.Schema.pick("id"),
});

export const updateUser = new DataAccess.Mutation({
  name: "updateUser",
  Args: Schema.extend(
    users.Schema.pick("id", "updatedAt"),
    users.Schema.omit(
      ...Struct.keys(TenantTable.fields),
      "origin",
      "username",
      "subjectId",
      "identityProviderId",
      "name",
      "email",
    ).pipe(Schema.partial),
  ),
});

export const deleteUser = new DataAccess.Mutation({
  name: "deleteUser",
  Args: Schema.Struct({
    id: NanoId,
    deletedAt: Schema.DateTimeUtc,
  }),
});

export const restoreUser = new DataAccess.Mutation({
  name: "restoreUser",
  Args: users.Schema.pick("id"),
});
