import { useCallback } from "react";
import { Link as AriaLink, composeRenderProps } from "react-aria-components";
import { AlertCircle, ArrowLeft, CircleCheckBig, LogIn } from "lucide-react";

import logo from "~/assets/logo.svg";
import topography from "~/assets/topography.svg";
import { RealtimeProvider } from "~/lib/contexts/stores/realtime/provider";
import { useSetupMachine, useSetupStatusState } from "~/lib/hooks/setup";
import { ConfiguringStatusItem } from "~/routes/setup/-components/status/configuring";
import { DeployingStatusItem } from "~/routes/setup/-components/status/deploying";
import { InitializingStatusItem } from "~/routes/setup/-components/status/initializing";
import { ProvisioningStatusItem } from "~/routes/setup/-components/status/provisioning";
import { RegisteringStatusItem } from "~/routes/setup/-components/status/registering";
import { TestingPapercutConnectionStatusItem } from "~/routes/setup/-components/status/testing-papercut-connection";
import { buttonStyles } from "~/styles/components/primitives/button";
import { Alert, AlertDescription, AlertTitle } from "~/ui/primitives/alert";
import { Button } from "~/ui/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";

export function SetupStatus() {
  const state = useSetupStatusState();
  const actor = useSetupMachine().useActorRef();

  return (
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
            <img src={logo} alt="Printdesk" className="size-24" />
          </div>

          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">Setting up</h1>

            <p className="text-muted-foreground text-balance">
              Do not close this page until the setup is complete. This may take
              several minutes.
            </p>
          </div>

          {state === "failure" ? (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />

              <AlertTitle>Error</AlertTitle>

              <AlertDescription>
                Something went wrong while setting up your organization. If this
                problem persists, please contact support.
              </AlertDescription>

              <div className="flex justify-end pt-4">
                <Button
                  variant="secondary"
                  className="gap-2"
                  onPress={() => actor.send({ type: "status.back" })}
                >
                  <ArrowLeft className="size-4" />
                  Go Back
                </Button>
              </div>
            </Alert>
          ) : null}

          {state === "complete" ? (
            <Alert className="[&>svg]:text-green-500">
              <CircleCheckBig className="size-4" />

              <AlertTitle>Setup Complete</AlertTitle>

              <AlertDescription>
                Setup is complete. Click the login button to continue.
              </AlertDescription>

              <div className="flex justify-end">
                <AriaLink
                  href={{ to: "/login" }}
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
                <PostInitializedStatusItems />
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PostInitializedStatusItems() {
  const trpcClient = useSetupMachine().useSelector(
    ({ context }) => context.trpcClient,
  );

  const webSocketUrlProvider = useCallback(
    async () => trpcClient.realtime.getPublicUrl.query(),
    [trpcClient],
  );

  const getWebSocketAuth = useCallback(
    async (channel?: string) =>
      trpcClient.realtime.getPublicAuth.query({ channel }),
    [trpcClient],
  );

  return (
    <RealtimeProvider
      urlProvider={webSocketUrlProvider}
      getAuth={getWebSocketAuth}
    >
      <RegisteringStatusItem />
      <ProvisioningStatusItem />
      <DeployingStatusItem />
      <ConfiguringStatusItem />
      <TestingPapercutConnectionStatusItem />
    </RealtimeProvider>
  );
}
