import { Schema, Struct } from "effect";

import { DataAccess } from "../data-access2";
import { SyncTable, TenantTable, View } from "../database2/shared";
import { NanoId } from "../utils2/shared";

import type { ActiveAnnouncementsView, AnnouncementsTable } from "./sql";

export const announcementsTableName = "announcements";
export const announcements = SyncTable<AnnouncementsTable>()(
  announcementsTableName,
  Schema.Struct({
    ...TenantTable.fields,
    content: Schema.String,
    roomId: NanoId,
    authorId: NanoId,
  }),
  ["create", "read", "update", "delete"],
);

export const activeAnnouncementsViewName = `active_${announcementsTableName}`;
export const activeAnnouncements = View<ActiveAnnouncementsView>()(
  activeAnnouncementsViewName,
  announcements.Schema,
);

export const createAnnouncement = new DataAccess.Mutation({
  name: "createAnnouncement",
  Args: announcements.Schema.omit("authorId", "deletedAt", "tenantId"),
});

export const updateAnnouncement = new DataAccess.Mutation({
  name: "updateAnnouncement",
  Args: Schema.extend(
    announcements.Schema.pick("id", "updatedAt"),
    announcements.Schema.omit(
      ...Struct.keys(TenantTable.fields),
      "roomId",
      "authorId",
    ).pipe(Schema.partial),
  ),
});

export const deleteAnnouncement = new DataAccess.Mutation({
  name: "deleteAnnouncement",
  Args: Schema.Struct({
    id: NanoId,
    deletedAt: Schema.DateTimeUtc,
  }),
});
