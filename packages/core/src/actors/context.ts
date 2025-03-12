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

export function assertActor<TActorKind extends Actor["kind"]>(
  kind: TActorKind,
) {
  const actor = useActor();

  if (actor.kind !== kind)
    throw new ApplicationError.InvalidActor(
      `Expected actor kind "${kind}", got "${actor.kind}".`,
    );

  return actor as Extract<Actor, { kind: TActorKind }>;
}

export type PrivateActor = Exclude<
  Actor,
  { kind: typeof Constants.ACTOR_KINDS.PUBLIC }
>;

export function assertPrivateActor(): PrivateActor {
  const actor = useActor();

  if (actor.kind === Constants.ACTOR_KINDS.PUBLIC)
    throw new ApplicationError.InvalidActor("Expected private actor.");

  return actor;
}
