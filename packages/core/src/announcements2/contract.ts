import { Schema, Struct } from "effect";

import { DataAccessContract } from "../data-access2/contract";
import { DatabaseContract } from "../database2/contract";
import { NanoId } from "../utils2";

import type { ActiveAnnouncementsView, AnnouncementsTable } from "./sql";

export namespace AnnouncementsContract {
  export const tableName = "announcements";
  export const table = DatabaseContract.SyncTable<AnnouncementsTable>()(
    tableName,
    Schema.Struct({
      ...DatabaseContract.TenantTable.fields,
      content: Schema.String,
      roomId: NanoId,
      authorId: NanoId,
    }),
    ["create", "read", "update", "delete"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView = DatabaseContract.View<ActiveAnnouncementsView>()(
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
        ...Struct.keys(DatabaseContract.TenantTable.fields),
        "roomId",
        "authorId",
      ).pipe(Schema.partial),
    ),
    Returns: table.Schema,
  });

  export const delete_ = new DataAccessContract.Function({
    name: "deleteAnnouncement",
    Args: Schema.Struct({
      id: NanoId,
      deletedAt: Schema.DateTimeUtc,
    }),
    Returns: table.Schema,
  });
}
