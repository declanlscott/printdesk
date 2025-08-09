import { Schema, Struct } from "effect";

import { DataAccess } from "../data-access2";
import { DatabaseContract } from "../database2/contract";
import { NanoId } from "../utils2/shared";

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

  export const create = new DataAccess.Function({
    name: "createAnnouncement",
    Args: table.Schema.omit("authorId", "deletedAt", "tenantId"),
  });

  export const update = new DataAccess.Function({
    name: "updateAnnouncement",
    Args: Schema.extend(
      table.Schema.pick("id", "updatedAt"),
      table.Schema.omit(
        ...Struct.keys(DatabaseContract.TenantTable.fields),
        "roomId",
        "authorId",
      ).pipe(Schema.partial),
    ),
  });

  export const delete_ = new DataAccess.Function({
    name: "deleteAnnouncement",
    Args: Schema.Struct({
      id: NanoId,
      deletedAt: Schema.DateTimeUtc,
    }),
  });
}
