import { isNull } from "drizzle-orm";
import { pgView, text } from "drizzle-orm/pg-core";

import { id, tenantTable } from "../database2/constructors";
import { AnnouncementsContract } from "./contract";

import type { TableContract } from "../database2/contract";

export const announcementsTable = tenantTable(AnnouncementsContract.tableName, {
  content: text("content").notNull(),
  roomId: id<TableContract.EntityId>("room_id").notNull(),
  authorId: id<TableContract.EntityId>("author_id").notNull(),
});
export type AnnouncementsTable = typeof announcementsTable;
export type Announcement = TableContract.Infer<AnnouncementsTable>;

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
  TableContract.InferFromView<ActiveAnnouncementsView>;
