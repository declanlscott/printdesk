import { Tenants } from "@printworks/core/tenants/client";

import { useUserSubject } from "~/lib/hooks/auth";
import { useSubscribe } from "~/lib/hooks/replicache";
import { useRouteApi } from "~/lib/hooks/route-api";

export function useTenant() {
  const { initialTenant } = useRouteApi("/_authenticated").useLoaderData();

  return useSubscribe(Tenants.get(useUserSubject().tenantId), {
    defaultData: initialTenant,
  });
}
