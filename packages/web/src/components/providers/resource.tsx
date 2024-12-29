import { useState } from "react";
import { parseResource } from "@printworks/core/utils/shared";

import { ResourceContext } from "~/lib/contexts";

import type { PropsWithChildren } from "react";
import type { ViteResource } from "~/types";

export function ResourceProvider(props: PropsWithChildren) {
  const [resource] = useState(() =>
    parseResource<ViteResource>("VITE_", import.meta.env),
  );

  return (
    <ResourceContext.Provider value={resource}>
      {props.children}
    </ResourceContext.Provider>
  );
}
