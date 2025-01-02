import { createContext, useContext, useState } from "react";
import { ApplicationError } from "@printworks/core/utils/errors";

import type { PropsWithChildren } from "react";
import type { StoreApi } from "zustand";

export function createStoreContext<TStore, TInput>(
  getStore: (input: TInput) => StoreApi<TStore>,
) {
  const Context = createContext<StoreApi<TStore> | null>(null);

  function Provider(props: PropsWithChildren<{ input: TInput }>) {
    const [store] = useState(() => getStore(props.input));

    return <Context.Provider value={store}>{props.children}</Context.Provider>;
  }

  return {
    useContext: () => {
      const context = useContext(Context);

      if (!context) throw new ApplicationError.MissingContextProvider();

      return context;
    },
    Context,
    Provider,
  };
}
