import { useState } from "react";
import { parseResource } from "@printworks/core/utils/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { Toaster } from "sonner";

import { routeTree } from "~/routeTree.gen";

import type { AppRouter, ViteResource } from "~/types";

const resource = parseResource<ViteResource>("VITE_", import.meta.env);
const queryClient = new QueryClient();

export function App() {
  const [router] = useState(() =>
    createRouter({
      routeTree,
      context: {
        // These will be set after we wrap the app router in providers
        resource,
        queryClient,
      },
    }),
  );

  // Hide the initial loading indicator
  // Router will handle the loading indicator afterwards with `defaultPendingComponent`
  document
    .getElementById("initial-app-loading-indicator")
    ?.style.setProperty("display", "none");

  return (
    <QueryClientProvider client={queryClient}>
      <AppRouter router={router} />

      <Toaster richColors />
    </QueryClientProvider>
  );
}

type AppRouterProps = {
  router: AppRouter;
};

function AppRouter(props: AppRouterProps) {
  return (
    <RouterProvider router={props.router} context={{ resource, queryClient }} />
  );
}
