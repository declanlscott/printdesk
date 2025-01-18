import { CommandBarStoreApi } from "~/lib/stores/command-bar";

export const useCommandBar = () =>
  CommandBarStoreApi.useSelector(({ input, pages }) => ({ input, pages }));

export const useCommandBarActions = () => CommandBarStoreApi.useActions();
