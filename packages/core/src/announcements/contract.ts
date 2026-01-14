import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { ColumnsContract } from "../columns/contract";
import { ProceduresContract } from "../procedures/contract";
import { TablesContract } from "../tables/contract";

import type { AnnouncementsSchema } from "./schema";

export namespace AnnouncementsContract {
  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    ...ColumnsContract.Tenant.fields,
    content: Schema.String,
    roomId: ColumnsContract.EntityId,
    authorId: ColumnsContract.EntityId,
  }) {}

  export const tableName = "announcements";
  export const table =
    new (TablesContract.makeClass<AnnouncementsSchema.Table>())(
      tableName,
      DataTransferObject,
      ["create", "read", "update", "delete"],
    );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    new (TablesContract.makeViewClass<AnnouncementsSchema.ActiveView>())(
      activeViewName,
      DataTransferObject,
    );

  export const activePublishedRoomViewName = `active_published_room_${tableName}`;
  export const activePublishedRoomView =
    new (TablesContract.makeViewClass<AnnouncementsSchema.ActivePublishedRoomView>())(
      activePublishedRoomViewName,
      DataTransferObject,
    );

  const IdOnly = Schema.Struct(
    Struct.evolve(Struct.pick(DataTransferObject.fields, "id"), {
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
    Args: DataTransferObject.pipe(
      Schema.omit("authorId", "deletedAt", "tenantId"),
    ),
    Returns: DataTransferObject,
  });

  export const edit = new ProceduresContract.Procedure({
    name: "editAnnouncement",
    Args: DataTransferObject.pipe(
      Schema.omit(
        ...Struct.keys(ColumnsContract.Tenant.fields),
        "roomId",
        "authorId",
      ),
      Schema.partial,
      Schema.extend(
        Schema.Struct(
          Struct.evolve(
            Struct.pick(DataTransferObject.fields, "id", "updatedAt"),
            { id: (id) => id.from },
          ),
        ),
      ),
    ),
    Returns: DataTransferObject,
  });

  export const delete_ = new ProceduresContract.Procedure({
    name: "deleteAnnouncement",
    Args: Schema.Struct(
      Struct.evolve(Struct.pick(DataTransferObject.fields, "id", "deletedAt"), {
        id: (id) => id.from,
        deletedAt: (deletedAt) => deletedAt.from.members[0],
      }),
    ),
    Returns: DataTransferObject,
  });

  export const restore = new ProceduresContract.Procedure({
    name: "restoreAnnouncement",
    Args: IdOnly,
    Returns: DataTransferObject,
  });
}
