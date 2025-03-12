import * as v from "valibot";

import { userSubjectPropertiesSchema } from "../auth/shared";
import { Constants } from "../utils/constants";
import { nanoIdSchema } from "../utils/shared";

export const publicActorSchema = v.object({
  kind: v.literal(Constants.ACTOR_KINDS.PUBLIC),
  properties: v.object({}),
});
export type PublicActor = v.InferOutput<typeof publicActorSchema>;

export const userActorSchema = v.object({
  kind: v.literal(Constants.ACTOR_KINDS.USER),
  properties: userSubjectPropertiesSchema,
});
export type UserActor = v.InferOutput<typeof userActorSchema>;

export const systemActorSchema = v.object({
  kind: v.literal(Constants.ACTOR_KINDS.SYSTEM),
  properties: v.object({ tenantId: nanoIdSchema }),
});
export type SystemActor = v.InferOutput<typeof systemActorSchema>;

export const actorSchema = v.variant("kind", [
  publicActorSchema,
  userActorSchema,
  systemActorSchema,
]);
export type Actor = v.InferOutput<typeof actorSchema>;
