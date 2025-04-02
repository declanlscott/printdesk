import { useEffect, useState } from "react";
import { createMutators } from "@printworks/core/data/client";
import { Constants } from "@printworks/core/utils/constants";
import { Replicache } from "replicache";
import { serialize } from "superjson";

import { ReplicacheContext } from "~/lib/contexts/replicache";
import { useAuth } from "~/lib/hooks/auth";
import { useResource } from "~/lib/hooks/resource";
import { AuthStoreApi } from "~/lib/stores/auth";
import { AppLoadingIndicator } from "~/ui/app-loading-indicator";

import type { PropsWithChildren } from "react";
import type { PushResponse } from "replicache";

export function ReplicacheProvider(props: PropsWithChildren) {
  const { user } = useAuth();

  const [replicache, setReplicache] = useState<ReplicacheContext>(() =>
    user ? { status: "initializing" } : { status: "uninitialized" },
  );

  const { AppData, ReplicacheLicenseKey } = useResource();

  const baseUrl = useResource().ApiReverseProxy.url;

  const { getAuth, refresh } = AuthStoreApi.useActions();

  useEffect(() => {
    if (!user) return setReplicache(() => ({ status: "uninitialized" }));

    const client = new Replicache({
      name: [user.tenantId, user.id].join(Constants.TOKEN_DELIMITER),
      licenseKey: ReplicacheLicenseKey.value,
      logLevel: AppData.isDev ? "info" : "error",
      mutators: createMutators(user.id),
      auth: getAuth(),
      pullURL: new URL("/replicache/pull", baseUrl).toString(),
      pusher: async (req) => {
        if (req.pushVersion !== 1)
          throw new Error(`Unsupported push version: ${req.pushVersion}`);

        const res = await fetch(new URL("/replicache/push", baseUrl), {
          method: "POST",
          headers: {
            Authorization: getAuth(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...req,
            mutations: req.mutations.map((mutation) => ({
              ...mutation,
              args: serialize(mutation.args),
            })),
          }),
        });
        if (!res.ok)
          return {
            httpRequestInfo: {
              httpStatusCode: res.status,
              errorMessage: await res.text(),
            },
          };

        const json = (await res.json()) as PushResponse | null;

        return {
          response: json ?? undefined,
          httpRequestInfo: {
            httpStatusCode: res.status,
            errorMessage: json?.error ?? "",
          },
        };
      },
    });

    client.getAuth = async () => refresh().then(getAuth);

    setReplicache(() => ({ status: "ready", client }));

    return () => {
      setReplicache(() => ({ status: "initializing" }));

      void client.close();
    };
  }, [
    baseUrl,
    AppData.isDev,
    getAuth,
    refresh,
    ReplicacheLicenseKey.value,
    user,
  ]);

  if (replicache.status === "initializing") return <AppLoadingIndicator />;

  return (
    <ReplicacheContext.Provider value={replicache}>
      {props.children}
    </ReplicacheContext.Provider>
  );
}
