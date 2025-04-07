import { useCallback } from "react";
import { Constants } from "@printworks/core/utils/constants";
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

  const webSocketUrlProvider = useCallback(
    async () => trpcClient.realtime.getUrl.query(),
    [trpcClient],
  );

  const getWebSocketAuth = useCallback(
    (channel?: string) => trpcClient.realtime.getAuth.query({ channel }),
    [trpcClient],
  );

  return (
    <RealtimeProvider
      urlProvider={webSocketUrlProvider}
      getAuth={getWebSocketAuth}
    >
      <Realtime />
    </RealtimeProvider>
  );
}

function Realtime() {
  const user = useUser();

  const replicache = useReplicache();

  const pullOnPoke = useCallback(
    (event: unknown) => {
      if (event === Constants.REPLICACHE_POKE) void replicache.pull();
    },
    [replicache],
  );

  useRealtimeChannel(`/replicache/users/${user.id}`, pullOnPoke);
  useRealtimeChannel(`/replicache/tenant`, pullOnPoke);

  return (
    <CommandBarStoreApiProvider>
      <MainNav />

      <main className="bg-muted/40 min-h-[calc(100vh_-_theme(spacing.16))]">
        <Outlet />
      </main>
    </CommandBarStoreApiProvider>
  );
}
