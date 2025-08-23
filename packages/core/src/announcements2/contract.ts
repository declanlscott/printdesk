import { Schema, Struct } from "effect";

import { DataAccessContract } from "../data-access2/contract";
import { TableContract } from "../database2/contract";

import type { ActiveAnnouncementsView, AnnouncementsTable } from "./sql";

export namespace AnnouncementsContract {
  export const tableName = "announcements";
  export const table = TableContract.Sync<AnnouncementsTable>()(
    tableName,
    Schema.Struct({
      ...TableContract.Tenant.fields,
      content: Schema.String,
      roomId: TableContract.EntityId,
      authorId: TableContract.EntityId,
    }),
    ["create", "read", "update", "delete"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView = TableContract.View<ActiveAnnouncementsView>()(
    activeViewName,
    table.Schema,
  );

  export const create = new DataAccessContract.Function({
    name: "createAnnouncement",
    Args: table.Schema.omit("authorId", "deletedAt", "tenantId"),
    Returns: table.Schema,
  });

  export const update = new DataAccessContract.Function({
    name: "updateAnnouncement",
    Args: Schema.extend(
      table.Schema.pick("id", "updatedAt"),
      table.Schema.omit(
        ...Struct.keys(TableContract.Tenant.fields),
        "roomId",
        "authorId",
      ).pipe(Schema.partial),
    ),
    Returns: table.Schema,
  });

  export const delete_ = new DataAccessContract.Function({
    name: "deleteAnnouncement",
    Args: Schema.Struct({
      id: TableContract.EntityId,
      deletedAt: Schema.DateTimeUtc,
    }),
    Returns: table.Schema,
  });
}
