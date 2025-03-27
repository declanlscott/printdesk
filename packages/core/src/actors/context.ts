import { ServerErrors } from "../errors";
import { Utils } from "../utils";
import { Constants } from "../utils/constants";

import type { Actor } from "./shared";

export type ActorContext = Actor;
export const ActorContext = Utils.createContext<ActorContext>("Actor");

export const useActor = ActorContext.use;
export const withActor = ActorContext.with;

export function assertActor<TActorKind extends Actor["kind"]>(
  kind: TActorKind,
) {
  const actor = useActor();

  if (actor.kind !== kind)
    throw new ServerErrors.InvalidActor(kind, actor.kind);

  return actor as Extract<Actor, { kind: TActorKind }>;
}

export type PrivateActor = Exclude<
  Actor,
  { kind: typeof Constants.ACTOR_KINDS.PUBLIC }
>;

export function assertPrivateActor(): PrivateActor {
  const actor = useActor();

  if (actor.kind === Constants.ACTOR_KINDS.PUBLIC)
    throw new ServerErrors.InvalidActor("private", actor.kind);

  return actor;
}
