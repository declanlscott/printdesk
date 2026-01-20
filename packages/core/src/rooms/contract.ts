import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { ColumnsContract } from "../columns/contract";
import { ProceduresContract } from "../procedures/contract";
import { TablesContract } from "../tables/contract";
import { generateId } from "../utils";

import type { RoomsSchema } from "./schema";

export namespace RoomsContract {
  export const statuses = ["draft", "published"] as const;
  export type Status = (typeof statuses)[number];

  export class Table extends TablesContract.Table<RoomsSchema.Table>("rooms")(
    class Dto extends ColumnsContract.BaseEntity.extend<Dto>("Room")({
      name: ColumnsContract.VarChar,
      status: Schema.Literal(...statuses).pipe(
        Schema.optionalWith({ default: () => "draft" }),
      ),
      details: Schema.String.pipe(Schema.NullOr),
    }) {},
    ["create", "read", "update", "delete"],
  ) {}

  export class ActiveView extends TablesContract.View<RoomsSchema.ActiveView>(
    "active_rooms",
  )(
    class Dto extends Schema.Class<Dto>("ActiveRoom")(
      Struct.evolve(Table.DataTransferObject.fields, {
        deletedAt: (deletedAt) => deletedAt.from.members[1],
      }),
    ) {},
  ) {}

  export class ActivePublishedView extends TablesContract.View<RoomsSchema.ActivePublishedView>(
    "active_published_rooms",
  )(
    class Dto extends Schema.Class<Dto>("ActivePublishedRoom")(
      Struct.evolve(ActiveView.DataTransferObject.fields, {
        status: (status) => Schema.Literal(status.from.literals[1]),
      }),
    ) {},
  ) {}

  const IdOnly = Schema.Struct(
    Struct.evolve(Struct.pick(Table.DataTransferObject.fields, "id"), {
      id: (id) => id.from,
    }),
  );

  const IdAndUpdatedAt = Schema.Struct(
    Struct.evolve(
      Struct.pick(Table.DataTransferObject.fields, "id", "updatedAt"),
      { id: (id) => id.from },
    ),
  );

  export const canEdit = new ProceduresContract.Procedure({
    name: "canEditRoom",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  export const canDelete = new ProceduresContract.Procedure({
    name: "canDeleteRoom",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  export const canRestore = new ProceduresContract.Procedure({
    name: "canRestoreRoom",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  export const create = new ProceduresContract.Procedure({
    name: "createRoom",
    Args: Table.DataTransferObject.pipe(
      Schema.omit("deletedAt", "tenantId"),
      Schema.extend(
        Schema.Struct({
          workflowId: ColumnsContract.EntityId.pipe(
            Schema.optionalWith({ default: generateId }),
          ),
        }),
      ),
    ),
    Returns: Table.DataTransferObject,
  });

  export const edit = new ProceduresContract.Procedure({
    name: "editRoom",
    Args: Table.DataTransferObject.pipe(
      Schema.omit(...Struct.keys(ColumnsContract.BaseEntity.fields), "status"),
      Schema.partial,
      Schema.extend(
        Schema.Struct(
          Struct.evolve(
            Struct.pick(Table.DataTransferObject.fields, "id", "updatedAt"),
            { id: (id) => id.from },
          ),
        ),
      ),
    ),
    Returns: Table.DataTransferObject,
  });

  export const publish = new ProceduresContract.Procedure({
    name: "publishRoom",
    Args: IdAndUpdatedAt,
    Returns: Table.DataTransferObject,
  });

  export const draft = new ProceduresContract.Procedure({
    name: "draftRoom",
    Args: IdAndUpdatedAt,
    Returns: Table.DataTransferObject,
  });

  export const delete_ = new ProceduresContract.Procedure({
    name: "deleteRoom",
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
    name: "restoreRoom",
    Args: IdOnly,
    Returns: Table.DataTransferObject,
  });
}
