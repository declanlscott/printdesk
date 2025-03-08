import * as v from "valibot";

import { userSubjectPropertiesSchema } from "../auth/shared";
import { Constants } from "../utils/constants";
import { nanoIdSchema } from "../utils/shared";

export const publicActorSchema = v.object({
  type: v.literal(Constants.ACTOR_TYPES.PUBLIC),
  properties: v.object({}),
});
export type PublicActor = v.InferOutput<typeof publicActorSchema>;

export const userActorSchema = v.object({
  type: v.literal(Constants.ACTOR_TYPES.USER),
  properties: userSubjectPropertiesSchema,
});
export type UserActor = v.InferOutput<typeof userActorSchema>;

export const systemActorSchema = v.object({
  type: v.literal(Constants.ACTOR_TYPES.SYSTEM),
  properties: v.object({ tenantId: nanoIdSchema }),
});
export type SystemActor = v.InferOutput<typeof systemActorSchema>;

export const actorSchema = v.variant("type", [
  publicActorSchema,
  userActorSchema,
  systemActorSchema,
]);
export type Actor = v.InferOutput<typeof actorSchema>;
