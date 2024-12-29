import { useStore } from "zustand";

import { CommandBarStore } from "~/lib/stores/command-bar";

export const useCommandBar = () =>
  useStore(CommandBarStore.useContext(), (store) => ({
    input: store.input,
    pages: store.pages,
  }));

export const useCommandBarActions = () =>
  useStore(CommandBarStore.useContext(), (store) => store.actions);
