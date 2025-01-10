import { createContext, useContext, useState } from "react";
import { ApplicationError } from "@printworks/core/utils/errors";

import type { PropsWithChildren } from "react";
import type { StoreApi } from "zustand";

export function createStoreApiContext<TStore, TInput>(
  getStoreApi: (input: TInput) => StoreApi<TStore>,
) {
  const Context = createContext<StoreApi<TStore> | null>(null);

  function Provider(props: PropsWithChildren<{ input: TInput }>) {
    const [storeApi] = useState(() => getStoreApi(props.input));

    return (
      <Context.Provider value={storeApi}>{props.children}</Context.Provider>
    );
  }

  return {
    use: () => {
      const storeApi = useContext(Context);

      if (!storeApi) throw new ApplicationError.MissingContextProvider();

      return storeApi;
    },
    Context,
    Provider,
  };
}
