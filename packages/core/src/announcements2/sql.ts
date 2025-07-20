import { isNull } from "drizzle-orm";
import { pgView, text } from "drizzle-orm/pg-core";

import { id } from "../database/columns";
import { SyncTable, tenantTable, View } from "../database2/constructors";
import { announcementsTableName } from "./shared";

import type { InferFromTable } from "../database2/constructors";

export const announcementsTable = SyncTable(
  tenantTable(announcementsTableName, {
    content: text("content").notNull(),
    roomId: id("room_id").notNull(),
  }),
  ["create", "read", "update", "delete"],
);

export type AnnouncementsTable = (typeof announcementsTable)["table"];

export type Announcement = InferFromTable<AnnouncementsTable>;

export const activeAnnouncementsView = View(
  pgView(`active_${announcementsTableName}`).as((qb) =>
    qb
      .select()
      .from(announcementsTable.table)
      .where(isNull(announcementsTable.table.deletedAt)),
  ),
);
