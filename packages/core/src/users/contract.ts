import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { ColumnsContract } from "../columns/contract";
import { ProceduresContract } from "../procedures/contract";
import { TablesContract } from "../tables/contract";

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

  export const Role = Schema.Literal(...roles);
  export type Role = (typeof Role)["Type"];

  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    ...ColumnsContract.Tenant.fields,
    origin: Schema.Literal(...origins),
    username: Schema.String,
    externalId: Schema.String,
    identityProviderId: ColumnsContract.EntityId,
    role: Role.pipe(Schema.optionalWith({ default: () => "customer" })),
    name: Schema.String,
    email: Schema.String,
  }) {}
  export const DataTransferStruct = Schema.Struct(DataTransferObject.fields);

  export const tableName = "users";
  export const table = new (TablesContract.makeClass<UsersSchema.Table>())(
    tableName,
    DataTransferObject,
    ["read", "update", "delete"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    new (TablesContract.makeViewClass<UsersSchema.ActiveView>())(
      activeViewName,
      DataTransferObject,
    );

  export const isSelf = new ProceduresContract.Procedure({
    name: "isUserSelf",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const canEdit = new ProceduresContract.Procedure({
    name: "canEditUser",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const canDelete = new ProceduresContract.Procedure({
    name: "canDeleteUser",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const canRestore = new ProceduresContract.Procedure({
    name: "canRestoreUser",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const edit = new ProceduresContract.Procedure({
    name: "editUser",
    Args: Schema.extend(
      DataTransferStruct.pick("id", "updatedAt"),
      DataTransferStruct.omit(
        ...Struct.keys(ColumnsContract.Tenant.fields),
        "origin",
        "username",
        "externalId",
        "identityProviderId",
        "name",
        "email",
      ).pipe(Schema.partial),
    ),
    Returns: DataTransferObject,
  });

  export const delete_ = new ProceduresContract.Procedure({
    name: "deleteUser",
    Args: Schema.Struct({
      id: ColumnsContract.EntityId,
      deletedAt: Schema.DateTimeUtc,
    }),
    Returns: DataTransferObject,
  });

  export const restore = new ProceduresContract.Procedure({
    name: "restoreUser",
    Args: DataTransferStruct.pick("id"),
    Returns: DataTransferObject,
  });
}
