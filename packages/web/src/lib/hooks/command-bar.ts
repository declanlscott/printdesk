import { CommandBarStoreApi } from "~/lib/contexts/stores/command-bar";

export const useCommandBar = () =>
  CommandBarStoreApi.useSelector(({ input, pages }) => ({ input, pages }));

export const useCommandBarActions = CommandBarStoreApi.useActions;
