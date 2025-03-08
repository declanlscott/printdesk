import { Utils } from "../utils";
import { Constants } from "../utils/constants";
import { ApplicationError } from "../utils/errors";

import type { Actor } from "./shared";

export type ActorContext = Actor;
export const ActorContext = Utils.createContext<ActorContext>(
  Constants.CONTEXT_NAMES.ACTOR,
);

export const useActor = ActorContext.use;
export const withActor = ActorContext.with;

export function assertActor<TActorType extends Actor["type"]>(
  type: TActorType,
) {
  const actor = useActor();

  if (actor.type !== type)
    throw new ApplicationError.InvalidActor(
      `Expected actor type "${type}", got "${actor.type}".`,
    );

  return actor as Extract<Actor, { type: TActorType }>;
}

export type PrivateActor = Exclude<
  Actor,
  { type: typeof Constants.ACTOR_TYPES.PUBLIC }
>;

export function assertPrivateActor(): PrivateActor {
  const actor = useActor();

  if (actor.type === Constants.ACTOR_TYPES.PUBLIC)
    throw new ApplicationError.InvalidActor("Expected private actor.");

  return actor;
}
