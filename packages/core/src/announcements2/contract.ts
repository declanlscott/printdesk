import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { ColumnsContract } from "../columns2/contract";
import { ProceduresContract } from "../procedures/contract";
import { TablesContract } from "../tables2/contract";

import type { AnnouncementsSchema } from "./schema";

export namespace AnnouncementsContract {
  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "Dto",
  )({
    ...ColumnsContract.Tenant.fields,
    content: Schema.String,
    roomId: ColumnsContract.EntityId,
    authorId: ColumnsContract.EntityId,
  }) {}
  export const DataTransferStruct = Schema.Struct(DataTransferObject.fields);

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

  export const canEdit = new ProceduresContract.Procedure({
    name: "canEditAnnouncement",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const canDelete = new ProceduresContract.Procedure({
    name: "canDeleteAnnouncement",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const canRestore = new ProceduresContract.Procedure({
    name: "canRestoreAnnouncement",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const create = new ProceduresContract.Procedure({
    name: "createAnnouncement",
    Args: DataTransferStruct.omit("authorId", "deletedAt", "tenantId"),
    Returns: DataTransferObject,
  });

  export const edit = new ProceduresContract.Procedure({
    name: "editAnnouncement",
    Args: Schema.extend(
      DataTransferStruct.pick("id", "updatedAt"),
      DataTransferStruct.omit(
        ...Struct.keys(ColumnsContract.Tenant.fields),
        "roomId",
        "authorId",
      ).pipe(Schema.partial),
    ),
    Returns: DataTransferObject,
  });

  export const delete_ = new ProceduresContract.Procedure({
    name: "deleteAnnouncement",
    Args: Schema.Struct({
      id: ColumnsContract.EntityId,
      deletedAt: Schema.DateTimeUtc,
    }),
    Returns: DataTransferObject,
  });

  export const restore = new ProceduresContract.Procedure({
    name: "restoreAnnouncement",
    Args: DataTransferStruct.pick("id"),
    Returns: DataTransferObject,
  });
}
