import { Schema, Struct } from "effect";

import { SyncTable, TenantTable, View } from "../database2/shared";
import { SyncMutation } from "../sync2/shared";
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

export const updateUser = SyncMutation(
  "updateUser",
  Schema.extend(
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
);

export const deleteUser = SyncMutation(
  "deleteUser",
  Schema.Struct({
    id: NanoId,
    deletedAt: Schema.DateTimeUtc,
  }),
);

export const restoreUser = SyncMutation("restoreUser", users.Schema.pick("id"));
