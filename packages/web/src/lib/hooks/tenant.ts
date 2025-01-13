import { useUserSubject } from "~/lib/hooks/auth";
import { query } from "~/lib/hooks/data";
import { useSubscribe } from "~/lib/hooks/replicache";
import { useRouteApi } from "~/lib/hooks/route-api";

export function useTenant() {
  const { initialTenant } = useRouteApi("/_authenticated").useLoaderData();

  return useSubscribe(query.tenant(useUserSubject().tenantId), {
    defaultData: initialTenant,
  });
}
