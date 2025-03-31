import { useMemo, useState } from "react";
import { Constants } from "@printworks/core/utils/constants";
import { parseResource } from "@printworks/core/utils/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { Toaster } from "sonner";

import { ReplicacheProvider } from "~/lib/contexts/replicache/provider";
import { ResourceProvider } from "~/lib/contexts/resource/provider";
import { TRPCProvider } from "~/lib/contexts/trpc";
import { useReplicacheContext } from "~/lib/hooks/replicache";
import { AuthStoreApi } from "~/lib/stores/auth";
import { routeTree } from "~/routeTree.gen";
import { AppLoadingIndicator } from "~/ui/app-loading-indicator";

import type { Router } from "@printworks/functions/api/trpc/routers";
import type { AppRouter, ViteResource } from "~/types";

const resource = parseResource<ViteResource>(
  Constants.VITE_RESOURCE_PREFIX,
  import.meta.env,
);
const queryClient = new QueryClient();

export function App() {
  const [router] = useState(() =>
    createRouter({
      routeTree,
      context: {
        resource,
        queryClient,
        // NOTE: These will be set when the app router is wrapped with the providers
        authStoreApi: undefined!,
        replicache: undefined!,
        trpcClient: undefined!,
      },
      defaultPendingComponent: AppLoadingIndicator,
      scrollRestoration: true,
      trailingSlash: "never",
      defaultStructuralSharing: true,
    }),
  );

  // Hide the initial loading indicator
  // Router will handle the loading indicator afterwards with `defaultPendingComponent`
  document
    .getElementById("initial-app-loading-indicator")
    ?.style.setProperty("display", "none");

  return (
    <ResourceProvider resource={resource}>
      <QueryClientProvider client={queryClient}>
        <AuthStoreApi.Provider input={{ issuer: resource.Auth.url }}>
          <ReplicacheProvider>
            <AppRouter router={router} />

            <Toaster richColors />
          </ReplicacheProvider>
        </AuthStoreApi.Provider>
      </QueryClientProvider>
    </ResourceProvider>
  );
}

type AppRouterProps = {
  router: AppRouter;
};

function AppRouter(props: AppRouterProps) {
  const authStoreApi = AuthStoreApi.use();
  const replicache = useReplicacheContext();

  const token = AuthStoreApi.useSelector(({ tokens }) => tokens?.access);
  const trpcClient = useMemo(
    () =>
      createTRPCClient<Router>({
        links: [
          httpBatchLink({
            url: new URL("/trpc", resource.ApiReverseProxy.url),
            headers: () => (token ? { Authorization: `Bearer ${token}` } : {}),
          }),
        ],
      }),
    [token],
  );

  return (
    <TRPCProvider queryClient={queryClient} trpcClient={trpcClient}>
      <RouterProvider
        router={props.router}
        context={{
          resource,
          queryClient,
          authStoreApi,
          replicache,
          trpcClient,
        }}
      />
    </TRPCProvider>
  );
}
