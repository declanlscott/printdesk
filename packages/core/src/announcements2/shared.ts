import { Schema, Struct } from "effect";

import { SyncTable, TenantTable, View } from "../database2/shared";
import { NanoId } from "../utils2/shared";

import type { ActiveAnnouncementsView, AnnouncementsTable } from "./sql";

export const announcementsTableName = "announcements";
export const announcementsTable = SyncTable<AnnouncementsTable>()(
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
export const activeAnnouncementsView = View<ActiveAnnouncementsView>()(
  activeAnnouncementsViewName,
  announcementsTable.Schema,
);

export const CreateAnnouncement = announcementsTable.Schema.omit(
  "authorId",
  "deletedAt",
  "tenantId",
);

export const UpdateAnnouncement = Schema.extend(
  announcementsTable.Schema.pick("id", "updatedAt"),
  announcementsTable.Schema.omit(
    ...Struct.keys(TenantTable.fields),
    "roomId",
    "authorId",
  ).pipe(Schema.partial),
);

export const DeleteAnnouncement = Schema.Struct({
  id: NanoId,
  deletedAt: Schema.Date,
});
