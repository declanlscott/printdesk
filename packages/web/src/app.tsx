import { useState } from "react";
import { parseResource } from "@printworks/core/utils/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { Toaster } from "sonner";

import { ApiProvider } from "~/lib/contexts/api/provider";
import { ReplicacheProvider } from "~/lib/contexts/replicache/provider";
import { ResourceProvider } from "~/lib/contexts/resource/provider";
import { useApi } from "~/lib/hooks/api";
import { useReplicacheContext } from "~/lib/hooks/replicache";
import { AuthStoreApi } from "~/lib/stores/auth";
import { routeTree } from "~/routeTree.gen";
import { AppLoadingIndicator } from "~/ui/app-loading-indicator";

import type { AppRouter, ViteResource } from "~/types";

const resource = parseResource<ViteResource>("VITE_RESOURCE_", import.meta.env);
const queryClient = new QueryClient();

export function App() {
  const [router] = useState(() =>
    createRouter({
      routeTree,
      context: {
        // NOTE: These will be set when the app router is wrapped with the providers
        api: undefined!,
        authStoreApi: undefined!,
        replicache: undefined!,
        resource,
        queryClient,
      },
      defaultPendingComponent: AppLoadingIndicator,
    }),
  );

  // Hide the initial loading indicator
  // Router will handle the loading indicator afterwards with `defaultPendingComponent`
  document
    .getElementById("initial-app-loading-indicator")
    ?.style.setProperty("display", "none");

  return (
    <ResourceProvider resource={resource}>
      <ApiProvider>
        <QueryClientProvider client={queryClient}>
          <AuthStoreApi.Provider input={{ issuer: resource.Auth.url }}>
            <ReplicacheProvider>
              <AppRouter router={router} />

              <Toaster richColors />
            </ReplicacheProvider>
          </AuthStoreApi.Provider>
        </QueryClientProvider>
      </ApiProvider>
    </ResourceProvider>
  );
}

type AppRouterProps = {
  router: AppRouter;
};

function AppRouter(props: AppRouterProps) {
  const api = useApi();
  const authStoreApi = AuthStoreApi.use();
  const replicache = useReplicacheContext();

  return (
    <RouterProvider
      router={props.router}
      context={{ api, authStoreApi, replicache, resource, queryClient }}
    />
  );
}
