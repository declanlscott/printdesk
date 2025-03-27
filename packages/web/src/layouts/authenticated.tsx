import { useCallback } from "react";
import { Constants } from "@printworks/core/utils/constants";
import { Outlet } from "@tanstack/react-router";

import { RealtimeProvider } from "~/lib/contexts/realtime/provider";
import { useTRPCClient } from "~/lib/contexts/trpc";
import { useRealtimeChannel } from "~/lib/hooks/realtime";
import { useReplicache } from "~/lib/hooks/replicache";
import { useUser } from "~/lib/hooks/user";
import { CommandBarStoreApi } from "~/lib/stores/command-bar";
import { MainNav } from "~/ui/nav/main";

export function AuthenticatedLayout() {
  const trpcClient = useTRPCClient();

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
    <CommandBarStoreApi.Provider
      input={{ input: "", pages: [{ kind: "home" }] }}
    >
      <MainNav />

      <main className="bg-muted/40 min-h-[calc(100vh_-_theme(spacing.16))]">
        <Outlet />
      </main>
    </CommandBarStoreApi.Provider>
  );
}
