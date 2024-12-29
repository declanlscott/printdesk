import { useState } from "react";
import { createStore } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { PropsWithChildren } from "react";

export function AuthProvider(props: PropsWithChildren) {
  const [store] = useState(() =>
    createStore(
      persist((set, get) => ({}), {
        name: "auth",
        storage: createJSONStorage(() => localStorage),
      }),
    ),
  );

  return <>{props.children}</>;
}
