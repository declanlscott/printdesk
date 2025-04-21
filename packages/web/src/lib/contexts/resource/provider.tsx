import { useRef } from "react";
import { Constants } from "@printdesk/core/utils/constants";
import { parseResource } from "@printdesk/core/utils/shared";

import { ResourceContext } from "~/lib/contexts/resource";

import type { PropsWithChildren } from "react";
import type { ViteResource } from "~/types";

const resource = parseResource<ViteResource>(
  Constants.VITE_RESOURCE_PREFIX,
  import.meta.env,
);

export function ResourceProvider(props: PropsWithChildren) {
  const value = useRef(resource).current;

  return (
    <ResourceContext.Provider value={value}>
      {props.children}
    </ResourceContext.Provider>
  );
}
