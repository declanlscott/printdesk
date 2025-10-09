import { Schema, Struct } from "effect";

import { ColumnsContract } from "../columns2/contract";
import { DataAccessContract } from "../data-access2/contract";
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
  export const table = TablesContract.makeTable<AnnouncementsSchema.Table>()(
    tableName,
    DataTransferObject,
    ["create", "read", "update", "delete"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    TablesContract.makeView<AnnouncementsSchema.ActiveView>()(
      activeViewName,
      DataTransferObject,
    );

  export const activePublishedRoomViewName = `active_published_room_${tableName}`;
  export const activePublishedRoomView =
    TablesContract.makeView<AnnouncementsSchema.ActivePublishedRoomView>()(
      activePublishedRoomViewName,
      DataTransferObject,
    );

  export const canEdit = new DataAccessContract.Procedure({
    name: "canEditAnnouncement",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const canDelete = new DataAccessContract.Procedure({
    name: "canDeleteAnnouncement",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const canRestore = new DataAccessContract.Procedure({
    name: "canRestoreAnnouncement",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const create = new DataAccessContract.Procedure({
    name: "createAnnouncement",
    Args: DataTransferStruct.omit("authorId", "deletedAt", "tenantId"),
    Returns: DataTransferObject,
  });

  export const edit = new DataAccessContract.Procedure({
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

  export const delete_ = new DataAccessContract.Procedure({
    name: "deleteAnnouncement",
    Args: Schema.Struct({
      id: ColumnsContract.EntityId,
      deletedAt: Schema.DateTimeUtc,
    }),
    Returns: DataTransferObject,
  });

  export const restore = new DataAccessContract.Procedure({
    name: "restoreAnnouncement",
    Args: DataTransferStruct.pick("id"),
    Returns: DataTransferObject,
  });
}
