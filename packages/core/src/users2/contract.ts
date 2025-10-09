import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { ColumnsContract } from "../columns2/contract";
import { DataAccessContract } from "../data-access2/contract";
import { TablesContract } from "../tables2/contract";

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
    ...ColumnsContract.Tenant.fields,
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
  export const table = TablesContract.makeTable<UsersSchema.Table>()(
    tableName,
    DataTransferObject,
    ["read", "update", "delete"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView = TablesContract.makeView<UsersSchema.ActiveView>()(
    activeViewName,
    DataTransferObject,
  );

  export const isSelf = new DataAccessContract.Procedure({
    name: "isUserSelf",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const canEdit = new DataAccessContract.Procedure({
    name: "canEditUser",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const canDelete = new DataAccessContract.Procedure({
    name: "canDeleteUser",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const canRestore = new DataAccessContract.Procedure({
    name: "canRestoreUser",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const edit = new DataAccessContract.Procedure({
    name: "editUser",
    Args: Schema.extend(
      DataTransferStruct.pick("id", "updatedAt"),
      DataTransferStruct.omit(
        ...Struct.keys(ColumnsContract.Tenant.fields),
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

  export const delete_ = new DataAccessContract.Procedure({
    name: "deleteUser",
    Args: Schema.Struct({
      id: ColumnsContract.EntityId,
      deletedAt: Schema.DateTimeUtc,
    }),
    Returns: DataTransferObject,
  });

  export const restore = new DataAccessContract.Procedure({
    name: "restoreUser",
    Args: DataTransferStruct.pick("id"),
    Returns: DataTransferObject,
  });
}
