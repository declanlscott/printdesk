import { Schema, Struct } from "effect";

import { DataAccessContract } from "../data-access2/contract";
import { TableContract } from "../database2/contract";

import type { AnnouncementsSchema } from "./schema";

export namespace AnnouncementsContract {
  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "Dto",
  )({
    ...TableContract.Tenant.fields,
    content: Schema.String,
    roomId: TableContract.EntityId,
    authorId: TableContract.EntityId,
  }) {}
  export const DataTransferStruct = Schema.Struct(DataTransferObject.fields);

  export const tableName = "announcements";
  export const table = TableContract.Sync<AnnouncementsSchema.Table>()(
    tableName,
    DataTransferObject,
    ["create", "read", "update", "delete"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    TableContract.View<AnnouncementsSchema.ActiveView>()(
      activeViewName,
      DataTransferObject,
    );

  export const create = new DataAccessContract.Function({
    name: "createAnnouncement",
    Args: DataTransferStruct.omit("authorId", "deletedAt", "tenantId"),
    Returns: DataTransferObject,
  });

  export const update = new DataAccessContract.Function({
    name: "updateAnnouncement",
    Args: Schema.extend(
      DataTransferStruct.pick("id", "updatedAt"),
      DataTransferStruct.omit(
        ...Struct.keys(TableContract.Tenant.fields),
        "roomId",
        "authorId",
      ).pipe(Schema.partial),
    ),
    Returns: DataTransferObject,
  });

  export const delete_ = new DataAccessContract.Function({
    name: "deleteAnnouncement",
    Args: Schema.Struct({
      id: TableContract.EntityId,
      deletedAt: Schema.DateTimeUtc,
    }),
    Returns: DataTransferObject,
  });
}
