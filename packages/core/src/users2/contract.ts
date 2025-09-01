import { Schema, Struct } from "effect";

import { DataAccessContract } from "../data-access2/contract";
import { TableContract } from "../database2/contract";

import type { UsersSchema } from "./schema";

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

  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    ...TableContract.Tenant.fields,
    origin: Schema.Literal(...origins),
    username: Schema.String,
    subjectId: Schema.String,
    identityProviderId: Schema.String,
    role: Schema.Literal(...roles).pipe(
      Schema.optionalWith({ default: () => "customer" }),
    ),
    name: Schema.String,
    email: Schema.String,
  }) {}
  export const DataTransferStruct = Schema.Struct(DataTransferObject.fields);

  export const tableName = "users";
  export const table = TableContract.Sync<UsersSchema.Table>()(
    tableName,
    DataTransferObject,
    ["read", "update", "delete"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView = TableContract.View<UsersSchema.ActiveView>()(
    activeViewName,
    DataTransferObject,
  );

  export const isSelf = new DataAccessContract.Function({
    name: "isUserSelf",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const update = new DataAccessContract.Function({
    name: "updateUser",
    Args: Schema.extend(
      DataTransferStruct.pick("id", "updatedAt"),
      DataTransferStruct.omit(
        ...Struct.keys(TableContract.Tenant.fields),
        "origin",
        "username",
        "subjectId",
        "identityProviderId",
        "name",
        "email",
      ).pipe(Schema.partial),
    ),
    Returns: DataTransferObject,
  });

  export const delete_ = new DataAccessContract.Function({
    name: "deleteUser",
    Args: Schema.Struct({
      id: TableContract.EntityId,
      deletedAt: Schema.DateTimeUtc,
    }),
    Returns: DataTransferObject,
  });

  export const restore = new DataAccessContract.Function({
    name: "restoreUser",
    Args: DataTransferStruct.pick("id"),
    Returns: DataTransferObject,
  });
}
