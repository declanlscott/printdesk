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
  const context = createContext<StoreApi<TStore> | null>(null);

  function Provider(props: PropsWithChildren<{ input: TInput }>) {
    const [storeApi] = useState(() => getStoreApi(props.input));

    return (
      <context.Provider value={storeApi}>{props.children}</context.Provider>
    );
  }

  function use() {
    const storeApi = useContext(context);

    if (!storeApi) throw new ApplicationError.MissingContextProvider();

    return storeApi;
  }

  const useActions = () =>
    useStore(
      use(),
      useShallow(({ actions }) => actions as TStore["actions"]),
    );

  return {
    context,
    Provider,
    use,
    useActions,
  };
}
