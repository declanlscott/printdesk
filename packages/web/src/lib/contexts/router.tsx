import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  RouterProvider as _RouterProvider,
  createRouter,
} from "@tanstack/react-router";

import { useAuthStoreApi } from "~/lib/hooks/auth";
import { useReplicacheContext } from "~/lib/hooks/replicache";
import { useResource } from "~/lib/hooks/resource";
import { useTrpcClient } from "~/lib/hooks/trpc";
import { routeTree } from "~/routeTree.gen";
import { AppLoadingIndicator } from "~/ui/app-loading-indicator";

import type { ReactRouter } from "~/types";

export function RouterProvider() {
  const resource = useResource();
  const queryClient = useQueryClient();
  const authStoreApi = useAuthStoreApi();
  const trpcClient = useTrpcClient();
  const replicache = useReplicacheContext();

  const [router] = useState(
    () =>
      createRouter({
        routeTree,
        context: {
          resource,
          queryClient,
          authStoreApi,
          trpcClient,
          replicache,
        },
        defaultPendingComponent: AppLoadingIndicator,
        scrollRestoration: true,
        trailingSlash: "never",
        defaultStructuralSharing: true,
      }) satisfies ReactRouter,
  );

  return (
    <_RouterProvider
      router={router}
      context={{
        resource,
        queryClient,
        authStoreApi,
        trpcClient,
        replicache,
      }}
    />
  );
}
