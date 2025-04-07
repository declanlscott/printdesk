import { AuthStoreApi } from "~/lib/contexts/stores/auth";
import { useResource } from "~/lib/hooks/resource";

import type { PropsWithChildren } from "react";

export function AuthStoreApiProvider(props: PropsWithChildren) {
  const resource = useResource();

  return (
    <AuthStoreApi.Provider input={{ issuer: resource.Auth.url }}>
      {props.children}
    </AuthStoreApi.Provider>
  );
}
