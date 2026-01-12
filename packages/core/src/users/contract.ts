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

  const IdOnly = Schema.Struct(
    Struct.evolve(Struct.pick(DataTransferObject.fields, "id"), {
      id: (id) => id.from,
    }),
  );

  export const isSelf = new ProceduresContract.Procedure({
    name: "isUserSelf",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  export const canEdit = new ProceduresContract.Procedure({
    name: "canEditUser",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  export const canDelete = new ProceduresContract.Procedure({
    name: "canDeleteUser",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  export const canRestore = new ProceduresContract.Procedure({
    name: "canRestoreUser",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  export const edit = new ProceduresContract.Procedure({
    name: "editUser",
    Args: DataTransferObject.pipe(
      Schema.omit(
        ...Struct.keys(ColumnsContract.Tenant.fields),
        "origin",
        "username",
        "externalId",
        "identityProviderId",
        "name",
        "email",
        "role",
      ),
      Schema.partial,
      Schema.extend(
        Schema.Struct(
          Struct.evolve(
            Struct.pick(DataTransferObject.fields, "id", "updatedAt", "role"),
            {
              id: (id) => id.from,
              role: (role) => role.from.pipe(Schema.optional),
            },
          ),
        ),
      ),
    ),
    Returns: DataTransferObject,
  });

  export const delete_ = new ProceduresContract.Procedure({
    name: "deleteUser",
    Args: Schema.Struct(
      Struct.evolve(Struct.pick(DataTransferObject.fields, "id", "deletedAt"), {
        id: (id) => id.from,
        deletedAt: (deletedAt) => deletedAt.from,
      }),
    ),
    Returns: DataTransferObject,
  });

  export const restore = new ProceduresContract.Procedure({
    name: "restoreUser",
    Args: IdOnly,
    Returns: DataTransferObject,
  });
}
