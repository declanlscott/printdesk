import { useCallback } from "react";
import { composeRenderProps, Link } from "react-aria-components";
import { ApplicationError } from "@printworks/core/utils/errors";
import { Outlet } from "@tanstack/react-router";

import logo from "~/assets/logo.svg";
import topography from "~/assets/topography.svg";
import { RealtimeProvider } from "~/lib/contexts/realtime/provider";
import { useApi } from "~/lib/hooks/api";
import { useRouteApi } from "~/lib/hooks/route-api";
import { RegistrationWizardStoreApi } from "~/lib/stores/registration-wizard";
import { buttonStyles } from "~/styles/components/primitives/button";

export function RegistrationWizardLayout() {
  const tenantSlug = useRouteApi("/register/_wizard").useLoaderData();

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
    <div className="w-full lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px]">
      <div className="py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="flex justify-center">
            <Link href={{ to: "/" }}>
              <img src={logo} alt="Printworks" className="size-24" />
            </Link>
          </div>

          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">Register</h1>

            <p className="text-muted-foreground text-balance">
              Register your organization details below.
            </p>
          </div>

          <RealtimeProvider
            urlProvider={webSocketUrlProvider}
            getAuth={getWebSocketAuth}
          >
            <RegistrationWizardStoreApi.Provider input={{ tenantSlug }}>
              <Outlet />
            </RegistrationWizardStoreApi.Provider>
          </RealtimeProvider>

          <p className="text-sm">
            Already have an organization?{" "}
            <Link
              href={{ to: "/" }}
              className={composeRenderProps(
                "h-fit p-0",
                (className, renderProps) =>
                  buttonStyles({
                    ...renderProps,
                    variant: "link",
                    className,
                  }),
              )}
            >
              Login
            </Link>
          </p>
        </div>
      </div>

      <div
        className="bg-muted hidden lg:block lg:max-h-screen"
        style={{
          backgroundImage: `url(${topography})`,
          backgroundRepeat: "repeat",
        }}
      />
    </div>
  );
}
