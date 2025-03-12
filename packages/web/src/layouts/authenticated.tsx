import { useCallback } from "react";
import { Constants } from "@printworks/core/utils/constants";
import { ApplicationError } from "@printworks/core/utils/errors";
import { Outlet } from "@tanstack/react-router";

import { RealtimeProvider } from "~/lib/contexts/realtime/provider";
import { useApi } from "~/lib/hooks/api";
import { useRealtimeChannel } from "~/lib/hooks/realtime";
import { useReplicache } from "~/lib/hooks/replicache";
import { useUser } from "~/lib/hooks/user";
import { AuthStoreApi } from "~/lib/stores/auth";
import { CommandBarStoreApi } from "~/lib/stores/command-bar";
import { MainNav } from "~/ui/main-nav";

export function AuthenticatedLayout() {
  const api = useApi();

  const { getAuth } = AuthStoreApi.useActions();

  const webSocketUrlProvider = useCallback(async () => {
    const res = await api.client.realtime.url.$get({
      header: { authorization: getAuth() },
    });
    if (!res.ok)
      throw new ApplicationError.Error("Failed to get web socket url");

    const { url } = await res.json();

    return url;
  }, [api, getAuth]);

  const getWebSocketAuth = useCallback(
    async (channel?: string) => {
      const res = await api.client.realtime.auth.$get({
        header: { authorization: getAuth() },
        query: { channel },
      });
      if (!res.ok)
        throw new ApplicationError.Error("Failed to get web socket auth");

      const { auth } = await res.json();

      return auth;
    },
    [api, getAuth],
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
