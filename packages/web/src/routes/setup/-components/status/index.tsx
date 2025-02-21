import { useCallback } from "react";
import { Link as AriaLink, composeRenderProps } from "react-aria-components";
import { ApplicationError } from "@printworks/core/utils/errors";
import { AlertCircle, ArrowLeft, CircleCheckBig, LogIn } from "lucide-react";

import logo from "~/assets/logo.svg";
import topography from "~/assets/topography.svg";
import { RealtimeProvider } from "~/lib/contexts/realtime/provider";
import { useApi } from "~/lib/hooks/api";
import { useResource } from "~/lib/hooks/resource";
import { useSetupMachine, useSetupStatusState } from "~/lib/hooks/setup";
import { ActivatingStatusItem } from "~/routes/setup/-components/status/activating";
import { DeployingStatusItem } from "~/routes/setup/-components/status/deploying";
import { InitializingStatusItem } from "~/routes/setup/-components/status/initializing";
import { ProvisioningStatusItem } from "~/routes/setup/-components/status/provisioning";
import { RegisteringStatusItem } from "~/routes/setup/-components/status/registering";
import { SynchronizingStatusItem } from "~/routes/setup/-components/status/synchronizing";
import { buttonStyles } from "~/styles/components/primitives/button";
import { Alert, AlertDescription, AlertTitle } from "~/ui/primitives/alert";
import { Button } from "~/ui/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";

export function SetupStatus() {
  const state = useSetupStatusState();
  const actor = useSetupMachine().useActorRef();
  const slug = useSetupMachine().useSelector(
    ({ context }) => context.tenantSlug,
  );

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

  const isDev =
    useResource().AppData.isDev || window.location.hostname === "localhost";

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
              <img src={logo} alt="Printworks" className="size-24" />
            </div>

            <div className="grid gap-2 text-center">
              <h1 className="text-3xl font-bold">Setting up</h1>

              <p className="text-muted-foreground text-balance">
                Do not close this page until the setup is complete. This may
                take several minutes.
              </p>
            </div>

            {state === "failure" ? (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />

                <AlertTitle>Error</AlertTitle>

                <AlertDescription>
                  Something went wrong while setting up your organization.
                  Contact support if this problem persists.
                </AlertDescription>

                <div className="flex justify-end pt-4">
                  <Button
                    variant="secondary"
                    className="gap-2"
                    onPress={() => actor.send({ type: "status.back" })}
                  >
                    <ArrowLeft className="size-5" />
                    Go Back
                  </Button>
                </div>
              </Alert>
            ) : null}

            {state === "complete" ? (
              <Alert>
                <CircleCheckBig className="size-4 text-green-500" />

                <AlertTitle>Setup Complete</AlertTitle>

                <AlertDescription>
                  Setup is complete. Click the login button to get started.
                </AlertDescription>

                <div className="flex justify-end">
                  <AriaLink
                    href={{
                      to: "/login",
                      search: isDev ? { slug } : {},
                    }}
                    className={composeRenderProps(
                      "gap-2",
                      (className, renderProps) =>
                        buttonStyles({ className, ...renderProps }),
                    )}
                  >
                    <LogIn className="size-5" />
                    Login
                  </AriaLink>
                </div>
              </Alert>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>

              <CardContent className="grid gap-4">
                <ol>
                  <InitializingStatusItem />
                  <RegisteringStatusItem />
                  <ProvisioningStatusItem />
                  <DeployingStatusItem />
                  <SynchronizingStatusItem />
                  <ActivatingStatusItem />
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </RealtimeProvider>
  );
}
