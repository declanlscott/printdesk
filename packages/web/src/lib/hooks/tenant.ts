import { getRouteApi } from "@tanstack/react-router";

import { useUserSubject } from "~/lib/hooks/auth";
import { query } from "~/lib/hooks/data";
import { useSubscribe } from "~/lib/hooks/replicache";

const authenticatedRouteApi = getRouteApi("/_authenticated");

export const useTenant = () =>
  useSubscribe(query.tenant(useUserSubject().tenantId), {
    defaultData: authenticatedRouteApi.useLoaderData().initialTenant,
  });
