import { useCallback } from "react";
import { ApplicationError } from "@printworks/core/utils/errors";
import { Outlet } from "@tanstack/react-router";

import { RealtimeProvider } from "~/lib/contexts/realtime/provider";
import { useApi } from "~/lib/hooks/api";
import { useAuthActions } from "~/lib/hooks/auth";
import { useUser } from "~/lib/hooks/user";
import { CommandBarStoreApi } from "~/lib/stores/command-bar";
import { MainNav } from "~/ui/main-nav";

export function AuthenticatedLayout() {
  const api = useApi();

  const { getAuth } = useAuthActions();

  const webSocketUrlProvider = useCallback(async () => {
    const res = await api.client.realtime.url.$get({
      header: { authorization: getAuth() },
    });

    if (!res.ok)
      throw new ApplicationError.Error("Failed to get web socket url");

    const { url } = await res.json();

    return url;
  }, [api, getAuth]);

  const getWebSocketAuth = useCallback(async () => {
    const res = await api.client.realtime.auth.$get({
      header: { authorization: getAuth() },
    });
    if (!res.ok)
      throw new ApplicationError.Error("Failed to get web socket auth");

    const { auth } = await res.json();

    return auth;
  }, [api, getAuth]);

  return (
    <RealtimeProvider
      urlProvider={webSocketUrlProvider}
      getAuth={getWebSocketAuth}
    >
      <CommandBarStoreApi.Provider
        input={{ input: "", pages: [{ type: "home" }] }}
      >
        <MainNav />

        <main className="bg-muted/40 min-h-[calc(100vh_-_theme(spacing.16))]">
          <Outlet />
        </main>
      </CommandBarStoreApi.Provider>
    </RealtimeProvider>
  );
}
