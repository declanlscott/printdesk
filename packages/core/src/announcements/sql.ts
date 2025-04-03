import { text } from "drizzle-orm/pg-core";

import { id } from "../drizzle/columns";
import { tenantTable } from "../drizzle/tables";
import { announcementsTableName } from "./shared";

import type { InferTable } from "../drizzle/tables";

export const announcementsTable = tenantTable(announcementsTableName, {
  content: text("content").notNull(),
  roomId: id("room_id").notNull(),
});

export type AnnouncementsTable = typeof announcementsTable;

export type Announcement = InferTable<AnnouncementsTable>;
