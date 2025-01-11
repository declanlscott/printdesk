import { useCallback } from "react";
import { ApplicationError } from "@printworks/core/utils/errors";
import { createFileRoute, redirect } from "@tanstack/react-router";
import * as v from "valibot";

import { RealtimeProvider } from "~/lib/contexts/realtime/provider";
import { useApi } from "~/lib/hooks/api";
import { useRealtimeChannel } from "~/lib/hooks/realtime";

export const Route = createFileRoute("/register")({
  validateSearch: v.object({
    slug: v.optional(v.string()),
  }),
  loaderDeps: ({ search }) => ({ search }),
  beforeLoad: async ({ context }) => {
    try {
      await context.authStoreApi.getState().actions.verify();
    } catch {
      // Continue loading the register route if the user is unauthenticated
      return;
    }

    // Otherwise, redirect to the dashboard
    throw redirect({ to: "/" });
  },
  loader: async ({ context, deps }) => {
    const slug =
      context.resource.AppData.isDev || window.location.hostname === "localhost"
        ? deps.search.slug
        : window.location.hostname
            .split(`.${context.resource.AppData.domainName.fullyQualified}`)
            .at(0);
    if (!slug) throw new ApplicationError.Error("Missing slug");

    const res = await context.api.client.public.tenants["slug-availability"][
      ":value"
    ].$get({ param: { value: slug } });
    if (!res.ok) {
      switch (res.status as number) {
        case 429:
          throw new ApplicationError.Error(
            "Too many requests, try again later.",
          );
        default:
          throw new ApplicationError.Error("An unexpected error occurred.");
      }
    }

    const { isAvailable } = await res.json();
    if (!isAvailable)
      throw new ApplicationError.Error(`"${slug}" is unavailable to register.`);

    return slug;
  },
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
      <RegisterForm />
    </RealtimeProvider>
  );
}

function RegisterForm() {
  const slug = Route.useLoaderData();

  useRealtimeChannel("/events/*", (event) => {
    console.log(JSON.stringify(event, null, 2));
  });

  return <div>Hello "/register"!</div>;
}
