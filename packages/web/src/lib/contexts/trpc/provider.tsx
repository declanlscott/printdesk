import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";

import { TrpcContext } from "~/lib/contexts/trpc";
import { useAuthToken } from "~/lib/hooks/auth";
import { useResource } from "~/lib/hooks/resource";

import type { PropsWithChildren } from "react";
import type { TrpcRouter } from "@printworks/functions/api/trpc/routers";

export function TrpcProvider(props: PropsWithChildren) {
  const queryClient = useQueryClient();

  const apiBaseUrl = useResource().ApiReverseProxy.url;
  const authToken = useAuthToken();
  const trpcClient = useMemo(
    () =>
      createTRPCClient<TrpcRouter>({
        links: [
          httpBatchLink({
            url: new URL("/trpc", apiBaseUrl),
            headers: () =>
              authToken ? { Authorization: `Bearer ${authToken}` } : {},
          }),
        ],
      }),
    [apiBaseUrl, authToken],
  );

  return (
    <TrpcContext.TRPCProvider queryClient={queryClient} trpcClient={trpcClient}>
      {props.children}
    </TrpcContext.TRPCProvider>
  );
}
