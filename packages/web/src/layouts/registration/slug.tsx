import { Outlet } from "@tanstack/react-router";

import { useRouteApi } from "~/lib/hooks/route-api";
import { RegistrationStoreApi } from "~/lib/stores/registration";

export function RegistrationSlugLayout() {
  const tenantSlug = useRouteApi("/register/_slug").useLoaderData();

  return (
    <RegistrationStoreApi.Provider input={{ tenantSlug }}>
      <Outlet />
    </RegistrationStoreApi.Provider>
  );
}
