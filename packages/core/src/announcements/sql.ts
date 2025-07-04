import { text } from "drizzle-orm/pg-core";

import { id } from "../database/columns";
import { tenantTable } from "../database/tables";
import { announcementsTableName } from "./shared";

import type { InferFromTable } from "../database/tables";

export const announcementsTable = tenantTable(announcementsTableName, {
  content: text("content").notNull(),
  roomId: id("room_id").notNull(),
});

export type AnnouncementsTable = typeof announcementsTable;

export type Announcement = InferFromTable<AnnouncementsTable>;
