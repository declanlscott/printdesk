import { isNull } from "drizzle-orm";
import { pgView, text } from "drizzle-orm/pg-core";

import { id, tenantTable } from "../database2/constructors";
import { activeAnnouncementsViewName, announcementsTableName } from "./shared";

import type { InferFromTable, InferFromView } from "../database2/shared";

export const announcementsTable = tenantTable(announcementsTableName, {
  content: text("content").notNull(),
  roomId: id("room_id").notNull(),
  authorId: id("author_id").notNull(),
});
export type AnnouncementsTable = typeof announcementsTable;
export type Announcement = InferFromTable<AnnouncementsTable>;

export const activeAnnouncementsView = pgView(activeAnnouncementsViewName).as(
  (qb) =>
    qb
      .select()
      .from(announcementsTable)
      .where(isNull(announcementsTable.deletedAt)),
);
export type ActiveAnnouncementsView = typeof activeAnnouncementsView;
export type ActiveAnnouncement = InferFromView<ActiveAnnouncementsView>;
