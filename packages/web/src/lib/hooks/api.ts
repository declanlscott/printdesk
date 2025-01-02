import { useContext } from "react";
import { ApplicationError } from "@printworks/core/utils/errors";

import { ApiContext } from "~/lib/contexts/api";

export function useApi() {
  const context = useContext(ApiContext);

  if (!context) throw new ApplicationError.MissingContextProvider("Api");

  return context;
}
