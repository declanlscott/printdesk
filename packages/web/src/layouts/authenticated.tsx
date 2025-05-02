import { useCallback } from "react";
import { Realtime } from "@printdesk/core/realtime/client";
import { Outlet } from "@tanstack/react-router";

import { CommandBarStoreApiProvider } from "~/lib/contexts/stores/command-bar/provider";
import { RealtimeProvider } from "~/lib/contexts/stores/realtime/provider";
import { useRealtimeChannel } from "~/lib/hooks/realtime";
import { useReplicache } from "~/lib/hooks/replicache";
import { useTrpcClient } from "~/lib/hooks/trpc";
import { useUser } from "~/lib/hooks/user";
import { MainNav } from "~/ui/nav/main";

export function AuthenticatedLayout() {
  const trpcClient = useTrpcClient();

  const realtimeUrlProvider = useCallback(
    async () => trpcClient.realtime.getUrl.query(),
    [trpcClient],
  );

  const getRealtimeAuthorization = useCallback(
    () => trpcClient.realtime.getAuthorization.query({}),
    [trpcClient],
  );

  return (
    <RealtimeProvider
      urlProvider={realtimeUrlProvider}
      getAuthorization={getRealtimeAuthorization}
    >
      <InnerLayout />
    </RealtimeProvider>
  );
}

function InnerLayout() {
  const user = useUser();

  const replicache = useReplicache();

  const handlePull = useCallback(
    (event: unknown) => {
      const puller = Realtime.handleEvent((event) => {
        if (event.kind === "replicache_poke") void replicache.pull();
      });

      return puller(event);
    },
    [replicache],
  );

  useRealtimeChannel(`/replicache/users/${user.id}`, handlePull);
  useRealtimeChannel(`/replicache/tenant`, handlePull);

  return (
    <CommandBarStoreApiProvider>
      <MainNav />

      <main className="bg-muted/40 min-h-[calc(100vh_-_theme(spacing.16))]">
        <Outlet />
      </main>
    </CommandBarStoreApiProvider>
  );
}
