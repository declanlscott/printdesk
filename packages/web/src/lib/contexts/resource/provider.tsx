import { useRef } from "react";

import { ResourceContext } from "~/lib/contexts/resource";

import type { PropsWithChildren } from "react";
import type { ViteResource } from "~/types";

type ResourceProviderProps = PropsWithChildren<{
  resource: ViteResource;
}>;

export function ResourceProvider(props: ResourceProviderProps) {
  const resource = useRef(props.resource).current;

  return (
    <ResourceContext.Provider value={resource}>
      {props.children}
    </ResourceContext.Provider>
  );
}
