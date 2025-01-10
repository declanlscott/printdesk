import { createStore } from "zustand/vanilla";

import { createStoreApiContext } from "~/lib/contexts/store";

import type { CommandBarPage } from "~/types";

export type CommandBarStore = {
  input: string;
  pages: Array<CommandBarPage>;
  actions: {
    setInput: (input: string) => void;
    pushPage: (page: CommandBarPage) => void;
    popPage: () => void;
    getActivePage: () => CommandBarPage;
    reset: () => void;
  };
};

export const CommandBarStoreApi = createStoreApiContext<
  CommandBarStore,
  Omit<CommandBarStore, "actions">
>(({ input, pages }) =>
  createStore((set, get) => ({
    input,
    pages,
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
