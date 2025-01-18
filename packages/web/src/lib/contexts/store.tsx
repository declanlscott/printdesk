import { createContext, useContext, useState } from "react";
import { ApplicationError } from "@printworks/core/utils/errors";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { PropsWithChildren } from "react";
import type { StoreApi } from "zustand";

export function createStoreApiContext<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TStore extends { actions: Record<string, any> },
  TInput,
>(getStoreApi: (input: TInput) => StoreApi<TStore>) {
  const Context = createContext<StoreApi<TStore> | null>(null);

  function Provider(props: PropsWithChildren<{ input: TInput }>) {
    const [storeApi] = useState(() => getStoreApi(props.input));

    return (
      <Context.Provider value={storeApi}>{props.children}</Context.Provider>
    );
  }

  function use() {
    const storeApi = useContext(Context);

    if (!storeApi) throw new ApplicationError.MissingContextProvider();

    return storeApi;
  }

  const useSelector = <
    TSelector extends (store: TStore) => ReturnType<TSelector>,
  >(
    selector: TSelector,
  ) => useStore(use(), useShallow(selector));

  const useActions = () =>
    useSelector(({ actions }) => actions as TStore["actions"]);

  return {
    Context,
    Provider,
    use,
    useSelector,
    useActions,
  };
}
