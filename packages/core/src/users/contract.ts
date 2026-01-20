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

  export class Table extends TablesContract.Table<UsersSchema.Table>("users")(
    class Dto extends ColumnsContract.BaseEntity.extend<Dto>("User")({
      origin: Schema.Literal(...origins),
      username: Schema.String,
      externalId: Schema.String,
      identityProviderId: ColumnsContract.EntityId,
      role: Role.pipe(Schema.optionalWith({ default: () => "customer" })),
      name: Schema.String,
      email: Schema.String,
    }) {},
    ["read", "update", "delete"],
  ) {}

  export class ActiveView extends TablesContract.View<UsersSchema.ActiveView>(
    "active_users",
  )(
    class Dto extends ColumnsContract.BaseEntity.extend<Dto>("ActiveUser")(
      Struct.evolve(Table.DataTransferObject.fields, {
        deletedAt: (deletedAt) => deletedAt.from.members[1],
      }),
    ) {},
  ) {}

  const IdOnly = Schema.Struct(
    Struct.evolve(Struct.pick(Table.DataTransferObject.fields, "id"), {
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
    Args: Table.DataTransferObject.pipe(
      Schema.omit(
        ...Struct.keys(ColumnsContract.BaseEntity.fields),
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
            Struct.pick(
              Table.DataTransferObject.fields,
              "id",
              "updatedAt",
              "role",
            ),
            {
              id: (id) => id.from,
              role: (role) => role.from.pipe(Schema.optional),
            },
          ),
        ),
      ),
    ),
    Returns: Table.DataTransferObject,
  });

  export const delete_ = new ProceduresContract.Procedure({
    name: "deleteUser",
    Args: Schema.Struct(
      Struct.evolve(
        Struct.pick(Table.DataTransferObject.fields, "id", "deletedAt"),
        {
          id: (id) => id.from,
          deletedAt: (deletedAt) => deletedAt.from.members[0],
        },
      ),
    ),
    Returns: Table.DataTransferObject,
  });

  export const restore = new ProceduresContract.Procedure({
    name: "restoreUser",
    Args: IdOnly,
    Returns: Table.DataTransferObject,
  });
}
