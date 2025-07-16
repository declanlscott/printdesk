import { text } from "drizzle-orm/pg-core";

import { id } from "../database/columns";
import { SyncTable, tenantTable } from "../database2/constructors";
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
