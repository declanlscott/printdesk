import { useState } from "react";
import { client } from "@printworks/functions/api/client";

import { ApiContext } from "~/lib/contexts/api";
import { useResource } from "~/lib/hooks/resource";

import type { PropsWithChildren } from "react";

export function ApiProvider(props: PropsWithChildren) {
  const baseUrl = useResource().Api.url;

  const [api] = useState(() => ({
    baseUrl,
    client: client(baseUrl),
  }));

  return (
    <ApiContext.Provider value={api}>{props.children}</ApiContext.Provider>
  );
}
