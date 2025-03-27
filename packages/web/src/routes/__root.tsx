import { lazy, Suspense } from "react";
import { RouterProvider } from "react-aria-components";
import { SharedErrors } from "@printworks/core/errors/shared";
import {
  createRootRouteWithContext,
  notFound,
  Outlet,
  useRouter,
} from "@tanstack/react-router";

import type { Router } from "@printworks/functions/api/trpc/routers";
import type { QueryClient } from "@tanstack/react-query";
import type { TRPCClient } from "@trpc/client";
import type { StoreApi } from "zustand";
import type { ReplicacheContext } from "~/lib/contexts/replicache";
import type { ResourceContext } from "~/lib/contexts/resource";
import type { AuthStore } from "~/lib/stores/auth";

const TanStackRouterDevtools = import.meta.env.DEV
  ? lazy(() =>
      // Lazy load in development
      import("@tanstack/router-devtools").then((module) => ({
        default: module.TanStackRouterDevtools,
      })),
    )
  : () => null;

type RouterContext = {
  authStoreApi: StoreApi<AuthStore>;
  replicache: ReplicacheContext;
  trpcClient: TRPCClient<Router>;
  resource: ResourceContext;
  queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RouteComponent,
  onError: (error) => {
    if (error instanceof SharedErrors.NotFound) throw notFound();

    throw error;
  },
});

function RouteComponent() {
  const { navigate, buildLocation } = useRouter();

  return (
    <RouterProvider
      navigate={(to, options) => navigate({ ...to, ...options })}
      useHref={(to) => buildLocation(to).href}
    >
      <Outlet />

      <Suspense>
        <TanStackRouterDevtools position="bottom-right" />
      </Suspense>
    </RouterProvider>
  );
}
