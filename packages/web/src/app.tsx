import { Toaster } from "sonner";

import { QueryClientProvider } from "~/lib/contexts/query-client";
import { ReplicacheProvider } from "~/lib/contexts/replicache/provider";
import { ResourceProvider } from "~/lib/contexts/resource/provider";
import { RouterProvider } from "~/lib/contexts/router";
import { AuthStoreApiProvider } from "~/lib/contexts/stores/auth/provider";
import { TrpcProvider } from "~/lib/contexts/trpc/provider";

export const App = () => (
  <ResourceProvider>
    <QueryClientProvider>
      <AuthStoreApiProvider>
        <TrpcProvider>
          <ReplicacheProvider>
            <RouterProvider />

            <Toaster richColors />
          </ReplicacheProvider>
        </TrpcProvider>
      </AuthStoreApiProvider>
    </QueryClientProvider>
  </ResourceProvider>
);
