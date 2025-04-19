import { lazy, Suspense } from "react";
import { RouterProvider } from "react-aria-components";
import { SharedErrors } from "@printworks/core/errors/shared";
import {
  createRootRouteWithContext,
  notFound,
  Outlet,
  retainSearchParams,
  useRouter,
} from "@tanstack/react-router";
import * as v from "valibot";

import type { TrpcRouter } from "@printworks/functions/api/trpc/routers";
import type { QueryClient } from "@tanstack/react-query";
import type { TRPCClient } from "@trpc/client";
import type { StoreApi } from "zustand";
import type { ReplicacheContext } from "~/lib/contexts/replicache";
import type { ResourceContext } from "~/lib/contexts/resource";
import type { AuthStore } from "~/lib/contexts/stores/auth";

const TanStackRouterDevtools = import.meta.env.DEV
  ? lazy(() =>
      // Lazy load in development
      import("@tanstack/router-devtools").then((module) => ({
        default: module.TanStackRouterDevtools,
      })),
    )
  : () => null;

type RouterContext = {
  resource: ResourceContext;
  queryClient: QueryClient;
  authStoreApi: StoreApi<AuthStore>;
  replicache: ReplicacheContext;
  trpcClient: TRPCClient<TrpcRouter>;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  validateSearch: v.object({ slug: v.optional(v.string()) }),
  search: { middlewares: [retainSearchParams(["slug"])] },
  beforeLoad: async ({ context, search }) => {
    const slug =
      context.resource.AppData.isDev || window.location.hostname === "localhost"
        ? search.slug
        : window.location.hostname
            .split(`.${context.resource.AppData.domainName.fullyQualified}`)
            .at(0);
    if (!slug) throw new Error("Missing slug");

    return { slug };
  },
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
