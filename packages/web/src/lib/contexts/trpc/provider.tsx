import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { TrpcContext } from "~/lib/contexts/trpc";
import { useAuthToken } from "~/lib/hooks/auth";
import { useResource } from "~/lib/hooks/resource";
import { createTrpcClient } from "~/lib/trpc";

import type { PropsWithChildren } from "react";

export function TrpcProvider(props: PropsWithChildren) {
  const queryClient = useQueryClient();

  const routerUrl = useResource().Router.url;
  const authToken = useAuthToken();

  const trpcClient = useMemo(
    () =>
      createTrpcClient(
        new URL("/api/trpc", routerUrl),
        authToken ? `Bearer ${authToken}` : undefined,
      ),
    [routerUrl, authToken],
  );

  return (
    <TrpcContext.TRPCProvider queryClient={queryClient} trpcClient={trpcClient}>
      {props.children}
    </TrpcContext.TRPCProvider>
  );
}
