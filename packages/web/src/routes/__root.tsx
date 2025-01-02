import { lazy, Suspense } from "react";
import { RouterProvider } from "react-aria-components";
import { ApplicationError } from "@printworks/core/utils/errors";
import {
  createRootRouteWithContext,
  notFound,
  Outlet,
  ScrollRestoration,
  useRouter,
} from "@tanstack/react-router";

import type { QueryClient } from "@tanstack/react-query";
import type { ApiContext } from "~/lib/contexts/api";
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
  api: ApiContext;
  authStore: AuthStore;
  replicache: ReplicacheContext;
  resource: ResourceContext;
  queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RouteComponent,
  onError: (error) => {
    if (error instanceof ApplicationError.EntityNotFound) throw notFound();

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

      <ScrollRestoration />

      <Suspense>
        <TanStackRouterDevtools position="bottom-right" />
      </Suspense>
    </RouterProvider>
  );
}
