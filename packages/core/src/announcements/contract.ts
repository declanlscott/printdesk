import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { ColumnsContract } from "../columns/contract";
import { ProceduresContract } from "../procedures/contract";
import { TablesContract } from "../tables/contract";

import type { AnnouncementsSchema } from "./schema";

export namespace AnnouncementsContract {
  export class Table extends TablesContract.Table<AnnouncementsSchema.Table>(
    "announcements",
  )(
    class Dto extends ColumnsContract.BaseEntity.extend<Dto>("Announcement")({
      content: Schema.String,
      roomId: ColumnsContract.EntityId,
      authorId: ColumnsContract.EntityId,
    }) {},
    ["create", "read", "update", "delete"],
  ) {}

  export class ActiveView extends TablesContract.View<AnnouncementsSchema.ActiveView>(
    "active_announcements",
  )(
    class Dto extends Schema.Class<Dto>("ActiveAnnouncement")(
      Struct.evolve(Table.DataTransferObject.fields, {
        deletedAt: (deletedAt) => deletedAt.from.members[1],
      }),
    ) {},
  ) {}

  export class ActivePublishedRoomView extends TablesContract.View<AnnouncementsSchema.ActivePublishedRoomView>(
    "active_published_room_announcements",
  )(ActiveView.DataTransferObject) {}

  const IdOnly = Schema.Struct(
    Struct.evolve(Struct.pick(Table.DataTransferObject.fields, "id"), {
      id: (id) => id.from,
    }),
  );

  export const canEdit = new ProceduresContract.Procedure({
    name: "canEditAnnouncement",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  export const canDelete = new ProceduresContract.Procedure({
    name: "canDeleteAnnouncement",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  export const canRestore = new ProceduresContract.Procedure({
    name: "canRestoreAnnouncement",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  export const create = new ProceduresContract.Procedure({
    name: "createAnnouncement",
    Args: Table.DataTransferObject.pipe(
      Schema.omit("authorId", "deletedAt", "tenantId"),
    ),
    Returns: Table.DataTransferObject,
  });

  export const edit = new ProceduresContract.Procedure({
    name: "editAnnouncement",
    Args: Table.DataTransferObject.pipe(
      Schema.omit(
        ...Struct.keys(ColumnsContract.BaseEntity.fields),
        "roomId",
        "authorId",
      ),
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

  export const delete_ = new ProceduresContract.Procedure({
    name: "deleteAnnouncement",
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
    name: "restoreAnnouncement",
    Args: IdOnly,
    Returns: Table.DataTransferObject,
  });
}
