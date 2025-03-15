import { useEffect, useState } from "react";
import { Replicache } from "replicache";
import { serialize } from "superjson";

import { ReplicacheContext } from "~/lib/contexts/replicache";
import { useApi } from "~/lib/hooks/api";
import { useAuth } from "~/lib/hooks/auth";
import { useMutatorsBuilder } from "~/lib/hooks/replicache";
import { useResource } from "~/lib/hooks/resource";
import { AuthStoreApi } from "~/lib/stores/auth";
import { AppLoadingIndicator } from "~/ui/app-loading-indicator";

import type { PropsWithChildren } from "react";

export function ReplicacheProvider(props: PropsWithChildren) {
  const { user } = useAuth();

  const [replicache, setReplicache] = useState<ReplicacheContext>(() =>
    user ? { status: "initializing" } : { status: "uninitialized" },
  );

  const { AppData, ReplicacheLicenseKey } = useResource();

  const buildMutators = useMutatorsBuilder();

  const api = useApi();

  const { getAuth, refresh } = AuthStoreApi.useActions();

  useEffect(() => {
    if (!user) return setReplicache(() => ({ status: "uninitialized" }));

    const client = new Replicache({
      name: `${user.tenantId}:${user.id}`,
      licenseKey: ReplicacheLicenseKey.value,
      logLevel: AppData.isDev ? "info" : "error",
      mutators: buildMutators(user.id),
      auth: getAuth(),
      pullURL: new URL("/replicache/pull", api.baseUrl).toString(),
      pusher: async (req) => {
        const res = await api.client.replicache.push.$post({
          header: {
            authorization: getAuth(),
          },
          json: {
            ...req,
            mutations: req.mutations.map((mutation) => ({
              ...mutation,
              args: serialize(mutation.args),
            })),
          },
        });
        if (!res.ok)
          return {
            httpRequestInfo: {
              httpStatusCode: res.status as number,
              errorMessage: await res.text(),
            },
          };

        const json = await res.json();

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
    api,
    AppData.isDev,
    getAuth,
    buildMutators,
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
