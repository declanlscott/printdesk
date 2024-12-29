import { useContext } from "react";
import { ApplicationError } from "@printworks/core/utils/errors";

import { ActorContext } from "~/lib/contexts";

export function useActor() {
  const context = useContext(ActorContext);
  if (!context) throw new ApplicationError.MissingContextProvider("Actor");

  return context;
}

export function useUserActor() {
  const actor = useActor();
  if (actor.type !== "user") throw new ApplicationError.Unauthenticated();

  return actor.properties;
}
