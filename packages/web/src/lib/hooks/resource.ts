import { useContext } from "react";
import { ClientErrors } from "@printdesk/core/errors/client";

import { ResourceContext } from "~/lib/contexts/resource";

export function useResource() {
  const context = useContext(ResourceContext);

  if (!context) throw new ClientErrors.MissingContextProvider("Resource");

  return context;
}
