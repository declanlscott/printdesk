import { useEffect, useMemo, useState } from "react";
import { createMutators } from "@printdesk/core/data/client";
import { delimitToken } from "@printdesk/core/utils/shared";
import { Replicache } from "@rocicorp/replicache";
import { serialize } from "superjson";

import { ReplicacheContext } from "~/lib/contexts/replicache";
import { useAuth, useAuthActions } from "~/lib/hooks/auth";
import { useResource } from "~/lib/hooks/resource";
import { AppLoadingIndicator } from "~/ui/app-loading-indicator";

import type { PropsWithChildren } from "react";
import type { PushResponse } from "@rocicorp/replicache";

export function ReplicacheProvider(props: PropsWithChildren) {
  const { user } = useAuth();

  const [replicache, setReplicache] = useState<ReplicacheContext>(() =>
    user ? { status: "initializing" } : { status: "uninitialized" },
  );

  const { AppData, Domains, ReplicacheLicenseKey } = useResource();

  const apiBaseUrl = useMemo(() => `https://${Domains.api}`, [Domains.api]);

  const { getAuth, refresh } = useAuthActions();

  useEffect(() => {
    if (!user) return setReplicache(() => ({ status: "uninitialized" }));

    const client = new Replicache({
      name: delimitToken(user.tenantId, user.id),
      licenseKey: ReplicacheLicenseKey.value,
      logLevel: AppData.isDevMode ? "info" : "error",
      mutators: createMutators(user.id),
      auth: getAuth(),
      pullURL: new URL("/replicache/pull", apiBaseUrl).toString(),
      pusher: async (req) => {
        if (req.pushVersion !== 1)
          throw new Error(`Unsupported push version: ${req.pushVersion}`);

        const res = await fetch(new URL("/replicache/push", apiBaseUrl), {
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
    apiBaseUrl,
    AppData.isDevMode,
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
