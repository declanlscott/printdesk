import * as v from "valibot";

import { userSubjectSchema } from "../auth/subjects";
import { nanoIdSchema } from "../utils/shared";

export const publicActorSchema = v.object({
  type: v.literal("public"),
  properties: v.object({}),
});
export type PublicActor = v.InferOutput<typeof publicActorSchema>;

export const userActorSchema = v.object({
  type: v.literal("user"),
  properties: userSubjectSchema,
});
export type UserActor = v.InferOutput<typeof userActorSchema>;

export const systemActorSchema = v.object({
  type: v.literal("system"),
  properties: v.object({ tenantId: nanoIdSchema }),
});
export type SystemActor = v.InferOutput<typeof systemActorSchema>;

export const actorSchema = v.variant("type", [
  publicActorSchema,
  userActorSchema,
  systemActorSchema,
]);
export type Actor = v.InferOutput<typeof actorSchema>;
