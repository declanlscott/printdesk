import { useState } from "react";
import { createStore } from "zustand";

import { CommandBarContext } from "~/lib/contexts";

import type { PropsWithChildren } from "react";
import type { CommandBarStore } from "~/lib/contexts";

export function CommandBarProvider(props: PropsWithChildren) {
  const [store] = useState(() =>
    createStore<CommandBarStore>((set, get) => ({
      input: "",
      pages: [{ type: "home" }],
      actions: {
        setInput: (input) => set({ input }),
        pushPage: (page) =>
          set(({ pages }) => ({ input: "", pages: [...pages, page] })),
        popPage: () => set(({ pages }) => ({ pages: pages.toSpliced(-1, 1) })),
        getActivePage: () => get().pages[get().pages.length - 1],
        reset: () => set(() => ({ input: "", pages: [{ type: "home" }] })),
      },
    })),
  );

  return (
    <CommandBarContext.Provider value={store}>
      {props.children}
    </CommandBarContext.Provider>
  );
}
