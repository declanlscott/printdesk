import { useEffect, useState } from "react";
import { createMutators } from "@printdesk/core/data/client";
import { delimitToken } from "@printdesk/core/utils/shared";
import { Replicache } from "replicache";
import { serialize } from "superjson";

import { ReplicacheContext } from "~/lib/contexts/replicache";
import { useAuth, useAuthActions } from "~/lib/hooks/auth";
import { useResource } from "~/lib/hooks/resource";
import { AppLoadingIndicator } from "~/ui/app-loading-indicator";

import type { PropsWithChildren } from "react";
import type { PushResponse } from "replicache";

export function ReplicacheProvider(props: PropsWithChildren) {
  const { user } = useAuth();

  const [replicache, setReplicache] = useState<ReplicacheContext>(() =>
    user ? { status: "initializing" } : { status: "uninitialized" },
  );

  const { AppData, ReplicacheLicenseKey, Router } = useResource();

  const { getAuth, refresh } = useAuthActions();

  useEffect(() => {
    if (!user) return setReplicache(() => ({ status: "uninitialized" }));

    const client = new Replicache({
      name: delimitToken(user.tenantId, user.id),
      licenseKey: ReplicacheLicenseKey.value,
      logLevel: AppData.isDevMode ? "info" : "error",
      mutators: createMutators(user.id),
      auth: getAuth(),
      pullURL: new URL("/api/replicache/pull", Router.url).toString(),
      pusher: async (req) => {
        if (req.pushVersion !== 1)
          throw new Error(`Unsupported push version: ${req.pushVersion}`);

        const res = await fetch(new URL("/api/replicache/push", Router.url), {
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
    AppData.isDevMode,
    getAuth,
    refresh,
    ReplicacheLicenseKey.value,
    Router.url,
    user,
  ]);

  if (replicache.status === "initializing") return <AppLoadingIndicator />;

  return (
    <ReplicacheContext.Provider value={replicache}>
      {props.children}
    </ReplicacheContext.Provider>
  );
}
