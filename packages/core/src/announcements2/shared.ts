import { Schema } from "effect";

import { TenantTable } from "../database2/constructors";
import { NanoId } from "../utils2/shared";

export const announcementsTableName = "announcements";

export const Announcement = Schema.Struct({
  ...TenantTable.fields,
  content: Schema.String,
  roomId: NanoId,
});

export const CreateAnnouncement = Schema.Struct({
  ...Announcement.omit("deletedAt").fields,
  deletedAt: Schema.Null,
});

export const UpdateAnnouncement = Schema.extend(
  Schema.Struct({
    id: NanoId,
    updatedAt: Schema.Date,
  }),
  Announcement.pick("content").pipe(Schema.partial),
);

export const DeleteAnnouncement = Schema.Struct({
  id: NanoId,
  deletedAt: Schema.Date,
});
