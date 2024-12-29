import { useState } from "react";

import { SlotContext } from "~/app/lib/contexts";

import type { PropsWithChildren } from "react";
import type { Slot } from "~/app/types";

type SlotProviderProps = PropsWithChildren<{
  slot: Slot;
}>;

export function SlotProvider(props: SlotProviderProps) {
  const [slot] = useState(() => props.slot);

  return (
    <SlotContext.Provider value={slot}>{props.children}</SlotContext.Provider>
  );
}
