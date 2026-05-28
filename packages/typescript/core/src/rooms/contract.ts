import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { ColumnsContract } from "../columns/contract";
import { ProceduresContract } from "../procedures/contract";
import { TablesContract } from "../tables/contract";
import { EntityId, generateEntityId } from "../utils";

import type { ActivePublishedRoomsView, ActiveRoomsView, RoomsTable } from "./sql";

export namespace RoomsContract {
  export const statuses = ["draft", "published"] as const;
  export type Status = (typeof statuses)[number];

  export class Table extends TablesContract.Table<RoomsTable>("rooms")(
    {
      ...TablesContract.BaseSyncModel.fields,
      name: ColumnsContract.VarChar,
      status: Schema.Literals(statuses).pipe(
        Schema.withDecodingDefaultType(Effect.succeed("draft")),
      ),
      details: Schema.String.pipe(Schema.NullOr),
    },
    ["create", "read", "update", "delete"],
  ) {}

  export class ActiveView extends TablesContract.View<ActiveRoomsView>(`active_${Table.name}`)(
    Struct.evolve(Table.Model.fields, {
      deletedAt: (deletedAt) => deletedAt.schema.from.schema.members[0].members[1],
    }),
  ) {}

  export class ActivePublishedView extends TablesContract.View<ActivePublishedRoomsView>(
    `active_published_${Table.name}`,
  )(
    Struct.evolve(ActiveView.Model.fields, {
      status: (status) => Schema.Literal(status.from.schema.members[0].literals[1]),
    }),
  ) {}

  const IdOnly = Schema.Struct(
    Struct.evolve(Struct.pick(Table.Model.fields, ["id"]), {
      id: (id) => id.from.schema.members[0],
    }),
  );

  const IdAndUpdatedAt = IdOnly.mapFields(
    Struct.assign(Struct.pick(Table.Model.fields, ["updatedAt"])),
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
    Args: Table.Dto.mapFields(Struct.omit(["deletedAt", "tenantId"])).mapFields(
      Struct.assign({
        workflowId: EntityId.pipe(Schema.withDecodingDefaultType(generateEntityId)),
      }),
    ),
    Returns: Table.Dto,
  });

  export const edit = new ProceduresContract.Procedure({
    name: "editRoom",
    Args: Table.Dto.mapFields(
      Struct.omit([...Struct.keys(TablesContract.BaseModel.fields), "status"]),
    )
      .mapFields(Struct.map(Schema.optional))
      .mapFields(Struct.assign(IdAndUpdatedAt.fields)),
    Returns: Table.Dto,
  });

  export const publish = new ProceduresContract.Procedure({
    name: "publishRoom",
    Args: IdAndUpdatedAt,
    Returns: Table.Dto,
  });

  export const draft = new ProceduresContract.Procedure({
    name: "draftRoom",
    Args: IdAndUpdatedAt,
    Returns: Table.Dto,
  });

  export const delete_ = new ProceduresContract.Procedure({
    name: "deleteRoom",
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
    name: "restoreRoom",
    Args: IdOnly,
    Returns: Table.Dto,
  });
}
