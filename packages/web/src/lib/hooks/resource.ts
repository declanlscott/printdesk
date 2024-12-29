import { useContext } from "react";
import { ApplicationError } from "@printworks/core/utils/errors";

import { ResourceContext } from "~/lib/contexts";

export function useResource() {
  const context = useContext(ResourceContext);

  if (!context) throw new ApplicationError.MissingContextProvider("Resource");

  return context;
}
