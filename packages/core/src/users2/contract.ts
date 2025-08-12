import { Schema, Struct } from "effect";

import { DataAccessContract } from "../data-access2/contract";
import { DatabaseContract } from "../database2/contract";
import { NanoId } from "../utils2";

import type { ActiveUsersView, UsersTable } from "./sql";

export namespace UsersContract {
  export const origins = ["papercut", "internal"] as const;
  export type Origin = (typeof origins)[number];

  export const roles = [
    "administrator",
    "operator",
    "manager",
    "customer",
  ] as const;
  export type Role = (typeof roles)[number];

  export const tableName = "users";
  export const table = DatabaseContract.SyncTable<UsersTable>()(
    tableName,
    Schema.Struct({
      ...DatabaseContract.TenantTable.fields,
      origin: Schema.Literal(...origins),
      username: Schema.String,
      subjectId: Schema.String,
      identityProviderId: Schema.String,
      role: Schema.Literal(...roles),
      name: Schema.String,
      email: Schema.String,
    }),
    ["read", "update", "delete"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView = DatabaseContract.View<ActiveUsersView>()(
    activeViewName,
    table.Schema,
  );

  export const isSelf = new DataAccessContract.Function({
    name: "isUserSelf",
    Args: table.Schema.pick("id"),
    Returns: Schema.Void,
  });

  export const update = new DataAccessContract.Function({
    name: "updateUser",
    Args: Schema.extend(
      table.Schema.pick("id", "updatedAt"),
      table.Schema.omit(
        ...Struct.keys(DatabaseContract.TenantTable.fields),
        "origin",
        "username",
        "subjectId",
        "identityProviderId",
        "name",
        "email",
      ).pipe(Schema.partial),
    ),
    Returns: table.Schema,
  });

  export const delete_ = new DataAccessContract.Function({
    name: "deleteUser",
    Args: Schema.Struct({
      id: NanoId,
      deletedAt: Schema.DateTimeUtc,
    }),
    Returns: table.Schema,
  });

  export const restore = new DataAccessContract.Function({
    name: "restoreUser",
    Args: table.Schema.pick("id"),
    Returns: table.Schema,
  });
}
