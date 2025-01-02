import { useState } from "react";
import { parseResource } from "@printworks/core/utils/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { useStore } from "zustand";

import { ApiProvider } from "~/lib/contexts/api/provider";
import { ReplicacheProvider } from "~/lib/contexts/replicache/provider";
import { ResourceProvider } from "~/lib/contexts/resource/provider";
import { useApi } from "~/lib/hooks/api";
import { useReplicache } from "~/lib/hooks/replicache";
import { AuthStore } from "~/lib/stores/auth";
import { routeTree } from "~/routeTree.gen";

import type { AppRouter, ViteResource } from "~/types";

const resource = parseResource<ViteResource>("VITE_", import.meta.env);
const queryClient = new QueryClient();

export function App() {
  const [router] = useState(() =>
    createRouter({
      routeTree,
      context: {
        // NOTE: These will be set when the app router is wrapped with the providers
        api: undefined!,
        authStore: undefined!,
        replicache: undefined!,
        resource,
        queryClient,
      },
      defaultPreload: "intent",
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
          <AuthStore.Provider input={{ issuer: resource.Auth.url }}>
            <ReplicacheProvider>
              <AppRouter router={router} />

              <Toaster richColors />
            </ReplicacheProvider>
          </AuthStore.Provider>
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
  const authStore = useStore(AuthStore.useContext());
  const replicache = useReplicache();

  return (
    <RouterProvider
      router={props.router}
      context={{ api, authStore, replicache, resource, queryClient }}
    />
  );
}
