import { getRouteApi } from "@tanstack/react-router";

import { useUserActor } from "~/app/lib/hooks/actor";
import { query } from "~/app/lib/hooks/data";
import { useSubscribe } from "~/app/lib/hooks/replicache";

const authenticatedRouteApi = getRouteApi("/_authenticated");

export const useTenant = () =>
  useSubscribe(query.tenant(useUserActor().tenantId), {
    defaultData: authenticatedRouteApi.useLoaderData().initialTenant,
  });
