import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import { CommandBarStoreApi } from "~/lib/stores/command-bar";

export const useCommandBar = () =>
  useStore(
    CommandBarStoreApi.use(),
    useShallow(({ input, pages }) => ({
      input,
      pages,
    })),
  );

export const useCommandBarActions = () =>
  useStore(
    CommandBarStoreApi.use(),
    useShallow(({ actions }) => actions),
  );
