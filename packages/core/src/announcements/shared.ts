import * as v from "valibot";

import { nanoIdSchema, tenantTableSchema } from "../utils/shared";

export const announcementsTableName = "announcements";

export const announcementSchema = v.object({
  ...tenantTableSchema.entries,
  content: v.string(),
  roomId: nanoIdSchema,
});

export const createAnnouncementMutationArgsSchema = v.object({
  ...v.omit(announcementSchema, ["deletedAt"]).entries,
  deletedAt: v.null(),
});
export type CreateAnnouncementMutationArgs = v.InferOutput<
  typeof createAnnouncementMutationArgsSchema
>;

export const updateAnnouncementMutationArgsSchema = v.object({
  id: nanoIdSchema,
  updatedAt: v.date(),
  ...v.partial(
    v.omit(announcementSchema, [
      "id",
      "tenantId",
      "createdAt",
      "updatedAt",
      "deletedAt",
    ]),
  ).entries,
});
export type UpdateAnnouncementMutationArgs = v.InferOutput<
  typeof updateAnnouncementMutationArgsSchema
>;

export const deleteAnnouncementMutationArgsSchema = v.object({
  id: nanoIdSchema,
  deletedAt: v.date(),
});
export type DeleteAnnouncementMutationArgs = v.InferOutput<
  typeof deleteAnnouncementMutationArgsSchema
>;
