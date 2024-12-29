import { useContext } from "react";
import { ApplicationError } from "@printworks/core/utils/errors";

import { SlotContext } from "~/app/lib/contexts";

export function useSlot() {
  const context = useContext(SlotContext);

  if (!context) throw new ApplicationError.MissingContextProvider("Slot");

  return context;
}
