import { useMemo } from "react";
import { HttpError } from "@printworks/core/utils/errors";
import { queryOptions } from "@tanstack/react-query";

import { useApi } from "~/lib/hooks/api";
import { AuthStoreApi } from "~/lib/stores/auth";

import type {
  UpdateServerAuthToken,
  UpdateServerTailnetUri,
} from "@printworks/core/papercut/shared";
import type { TailscaleOauthClient } from "@printworks/core/tailscale/shared";
import type { Client } from "@printworks/functions/api/client";
import type { MutationOptions } from "~/types";

export const query = {
  lastPapercutSync: (api: Client) =>
    queryOptions({
      queryKey: ["services", "papercut", "last-sync"],
      queryFn: async () => {
        const res = await api.services.papercut["last-sync"].$get();
        if (!res.ok) throw new HttpError.Error(res.statusText, res.status);

        const { lastSyncedAt } = await res.json();
        if (!lastSyncedAt) return null;

        return new Date(lastSyncedAt);
      },
    }),
};

export function useMutationOptions() {
  const api = useApi();

  const { getAuth, refresh } = AuthStoreApi.useActions();

  return useMemo(
    () =>
      ({
        papercutServerTailnetUri: () => ({
          mutationKey: ["services", "papercut", "server", "tailnet-uri"],
          mutationFn: async ({ tailnetUri }: UpdateServerTailnetUri) => {
            const call = async () =>
              api.client.services.papercut.server["tailnet-uri"].$put({
                header: { authorization: getAuth() },
                json: { tailnetUri },
              });

            const res = await call();
            if ((res.status as number) === 401) await refresh().then(call);
            if (!res.ok) throw new HttpError.Error(res.statusText, res.status);
          },
        }),
        papercutServerAuthToken: () => ({
          mutationKey: ["services", "papercut", "server", "auth-token"],
          mutationFn: async ({ authToken }: UpdateServerAuthToken) => {
            const call = async () =>
              api.client.services.papercut.server["auth-token"].$put({
                header: { authorization: getAuth() },
                json: { authToken },
              });

            const res = await call();
            if ((res.status as number) === 401) await refresh().then(call);
            if (!res.ok) throw new HttpError.Error(res.statusText, res.status);
          },
        }),
        tailscaleOauthClient: () => ({
          mutationKey: ["services", "tailscale", "oauth-client"],
          mutationFn: async ({ id, secret }: TailscaleOauthClient) => {
            const call = async () =>
              api.client.services.tailscale["oauth-client"].$put({
                header: { authorization: getAuth() },
                json: { id, secret },
              });

            const res = await call();
            if ((res.status as number) === 401) await refresh().then(call);
            if (!res.ok) throw new HttpError.Error(res.statusText, res.status);
          },
        }),
      }) satisfies MutationOptions,
    [api, getAuth, refresh],
  );
}
