import * as Effect from "effect/Effect";

import type { Actor } from "../actors";
import type { ActorsContract } from "../actors/contract";

export interface IamRoleShape {
  arn: Effect.Effect<string, ActorsContract.ForbiddenActorError, Actor>;
  name: Effect.Effect<string, ActorsContract.ForbiddenActorError, Actor>;
}
