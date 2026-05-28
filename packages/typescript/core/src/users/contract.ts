import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { ProceduresContract } from "../procedures/contract";
import { TablesContract } from "../tables/contract";
import { EntityId } from "../utils";

import type { ActiveUsersView, UsersTable } from "./sql";

export namespace UsersContract {
  export const origins = ["papercut", "internal"] as const;
  export type Origin = (typeof origins)[number];

  export const roles = ["administrator", "operator", "manager", "customer"] as const;

  export const Role = Schema.Literals(roles);
  export type Role = (typeof Role)["Type"];

  export class Table extends TablesContract.Table<UsersTable>("users")(
    {
      ...TablesContract.BaseSyncModel.fields,
      origin: Schema.Literals(origins),
      username: Schema.String,
      externalId: Schema.String,
      identityProviderId: EntityId,
      role: Role.pipe(Schema.withDecodingDefaultType(Effect.succeed("customer"))),
      name: Schema.String,
      email: Schema.String,
    },
    ["read", "update", "delete"],
  ) {}

  export class ActiveView extends TablesContract.View<ActiveUsersView>(`active_${Table.name}`)(
    Struct.evolve(Table.Model.fields, {
      deletedAt: (deletedAt) => deletedAt.schema.from.schema.members[0].members[1],
    }),
  ) {}

  const IdOnly = Schema.Struct(
    Struct.evolve(Struct.pick(Table.Model.fields, ["id"]), {
      id: (id) => id.from.schema.members[0],
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
    Args: Table.Dto.mapFields(
      Struct.omit([
        ...Struct.keys(TablesContract.BaseModel.fields),
        "origin",
        "username",
        "externalId",
        "identityProviderId",
        "name",
        "email",
        "role",
      ]),
    )
      .mapFields(Struct.map(Schema.optional))
      .mapFields(
        Struct.assign(
          Struct.evolve(Struct.pick(Table.Model.fields, ["id", "updatedAt", "role"]), {
            id: (id) => id.from.schema.members[0],
            role: (role) => role.from.schema.members[0].pipe(Schema.optional),
          }),
        ),
      ),
    Returns: Table.Dto,
  });

  export const delete_ = new ProceduresContract.Procedure({
    name: "deleteUser",
    Args: IdOnly.mapFields(
      Struct.assign(
        Struct.evolve(Struct.pick(Table.Model.fields, ["deletedAt"]), {
          deletedAt: (deletedAt) => deletedAt.schema.from.schema.members[0].members[0],
        }),
      ),
    ),
    Returns: Table.Dto,
  });

  export const restore = new ProceduresContract.Procedure({
    name: "restoreUser",
    Args: IdOnly,
    Returns: Table.Dto,
  });
}
