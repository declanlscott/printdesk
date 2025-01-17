import { useCallback, useState } from "react";
import { Link as AriaLink } from "react-aria-components";
import { handleEvent } from "@printworks/core/realtime/client";
import { ApplicationError } from "@printworks/core/utils/errors";
import { nanoIdSchema } from "@printworks/core/utils/shared";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import * as v from "valibot";

import logo from "~/assets/logo.svg";
import topography from "~/assets/topography.svg";
import { RealtimeProvider } from "~/lib/contexts/realtime/provider";
import { useApi } from "~/lib/hooks/api";
import { useRealtimeChannel } from "~/lib/hooks/realtime";
import { useResource } from "~/lib/hooks/resource";
import { Card } from "~/ui/primitives/card";

export const Route = createFileRoute("/register/_slug/status")({
  validateSearch: v.object({
    orgId: nanoIdSchema,
    eventId: v.string(),
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const api = useApi();

  const webSocketUrlProvider = useCallback(async () => {
    const res = await api.client.public.realtime.url.$get();
    if (!res.ok)
      throw new ApplicationError.Error("Failed to get web socket url");

    const { url } = await res.json();

    return url;
  }, [api]);

  const getWebSocketAuth = useCallback(
    async (channel?: string) => {
      const res = await api.client.public.realtime.auth.$get({
        query: { channel },
      });
      if (!res.ok)
        throw new ApplicationError.Error("Failed to get web socket auth");

      const { auth } = await res.json();

      return auth;
    },
    [api],
  );

  return (
    <RealtimeProvider
      urlProvider={webSocketUrlProvider}
      getAuth={getWebSocketAuth}
    >
      <div className="w-full lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px]">
        <div
          className="bg-muted hidden lg:block lg:max-h-screen"
          style={{
            backgroundImage: `url(${topography})`,
            backgroundRepeat: "repeat",
          }}
        />

        <div className="py-12">
          <div className="mx-auto grid max-w-sm gap-6">
            <div className="flex justify-center">
              <AriaLink href={{ to: "/" }}>
                <img src={logo} alt="Printworks" className="size-24" />
              </AriaLink>
            </div>

            <div className="grid gap-2 text-center">
              <h1 className="text-3xl font-bold">Registration</h1>
            </div>

            <p className="text-muted-foreground">The current status of</p>
          </div>
        </div>
      </div>
    </RealtimeProvider>
  );
}

function Status() {
  const { orgId, eventId } = Route.useSearch();

  const backendUrl = `https://${orgId}.backend.${useResource().AppData.domainName.fullyQualified}/api/health`;

  const [isPolling, setIsPolling] = useState(() => false);
  const [isHealthy, setIsHealthy] = useState(() => false);

  useRealtimeChannel(
    `/events/${eventId}`,
    handleEvent((event) => {
      if (event.type === "infra") {
        if (event.success) setIsPolling(() => true);
      }
    }),
  );

  useQuery({
    queryKey: [backendUrl],
    queryFn: async () => {
      const res = await fetch(backendUrl);
      if (!res.ok) return;

      setIsHealthy(() => true);
    },
    enabled: isPolling && !isHealthy,
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
  });

  return <Card></Card>;
}
