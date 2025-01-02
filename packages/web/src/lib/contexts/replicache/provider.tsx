import { useEffect, useState } from "react";
import loadingIndicator from "/loading-indicator.svg";
import { Replicache } from "replicache";
import { serialize } from "superjson";

import { ReplicacheContext } from "~/lib/contexts/replicache";
import { useApi } from "~/lib/hooks/api";
import { useAuth, useAuthActions } from "~/lib/hooks/auth";
import { useMutators } from "~/lib/hooks/replicache";
import { useResource } from "~/lib/hooks/resource";

import type { PropsWithChildren } from "react";

export function ReplicacheProvider(props: PropsWithChildren) {
  const { user } = useAuth();

  const [replicache, setReplicache] = useState<ReplicacheContext | null>(() =>
    user ? { status: "initializing" } : null,
  );

  const { AppData, ReplicacheLicenseKey } = useResource();

  const mutators = useMutators();

  const api = useApi();

  const { getAuth, refresh } = useAuthActions();

  useEffect(() => {
    if (!user) return setReplicache(() => null);

    const client = new Replicache({
      name: `${user.id}:${user.tenantId}`,
      licenseKey: ReplicacheLicenseKey.value,
      logLevel: AppData.isDev ? "info" : "error",
      mutators,
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
    mutators,
    refresh,
    ReplicacheLicenseKey.value,
    user,
  ]);

  if (replicache?.status === "initializing")
    return <img src={loadingIndicator} alt="Loading indicator" />;

  return (
    <ReplicacheContext.Provider value={replicache}>
      {props.children}
    </ReplicacheContext.Provider>
  );
}
