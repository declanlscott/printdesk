import { isNull } from "drizzle-orm";
import { pgView, text } from "drizzle-orm/pg-core";

import { id, tenantTable } from "../database2/constructors";
import { AnnouncementsContract } from "./contract";

import type { DatabaseContract } from "../database2/contract";

export const announcementsTable = tenantTable(AnnouncementsContract.tableName, {
  content: text("content").notNull(),
  roomId: id("room_id").notNull(),
  authorId: id("author_id").notNull(),
});
export type AnnouncementsTable = typeof announcementsTable;
export type Announcement = DatabaseContract.InferFromTable<AnnouncementsTable>;

export const activeAnnouncementsView = pgView(
  AnnouncementsContract.activeViewName,
).as((qb) =>
  qb
    .select()
    .from(announcementsTable)
    .where(isNull(announcementsTable.deletedAt)),
);
export type ActiveAnnouncementsView = typeof activeAnnouncementsView;
export type ActiveAnnouncement =
  DatabaseContract.InferFromView<ActiveAnnouncementsView>;
