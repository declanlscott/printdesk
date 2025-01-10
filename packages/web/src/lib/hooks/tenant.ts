import { useAuthenticatedRouteApi, useUserSubject } from "~/lib/hooks/auth";
import { query } from "~/lib/hooks/data";
import { useSubscribe } from "~/lib/hooks/replicache";

export function useTenant() {
  const { initialTenant } = useAuthenticatedRouteApi().useLoaderData();

  return useSubscribe(query.tenant(useUserSubject().tenantId), {
    defaultData: initialTenant,
  });
}
