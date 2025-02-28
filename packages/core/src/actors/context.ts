import { Utils } from "../utils";
import { ApplicationError } from "../utils/errors";

import type { Actor } from "./shared";

export type ActorContext = Actor;
export const ActorContext = Utils.createContext<ActorContext>("Actor");

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

export type PrivateActor = Exclude<Actor, { type: "public" }>;

export function assertPrivateActor(): PrivateActor {
  const actor = useActor();

  if (actor.type === "public")
    throw new ApplicationError.InvalidActor("Expected private actor.");

  return actor;
}
