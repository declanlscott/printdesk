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
export const usersTable = SyncTable<UsersTable>()(
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
export const activeUserView = View<ActiveUsersView>()(
  activeUsersViewName,
  usersTable.Schema,
);

export const updateUser = SyncMutation(
  "updateUser",
  Schema.extend(
    usersTable.Schema.pick("id", "updatedAt"),
    usersTable.Schema.omit(
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
    deletedAt: Schema.Date,
  }),
);

export const restoreUser = SyncMutation(
  "restoreUser",
  usersTable.Schema.pick("id"),
);
