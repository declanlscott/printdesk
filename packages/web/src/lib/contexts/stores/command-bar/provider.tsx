import { CommandBarStoreApi } from "~/lib/contexts/stores/command-bar";

import type { PropsWithChildren } from "react";

export const CommandBarStoreApiProvider = (props: PropsWithChildren) => (
  <CommandBarStoreApi.Provider input={{ input: "", pages: [{ kind: "home" }] }}>
    {props.children}
  </CommandBarStoreApi.Provider>
);
