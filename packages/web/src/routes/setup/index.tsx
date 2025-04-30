import { SharedErrors } from "@printdesk/core/errors/shared";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { createActorContext } from "@xstate/react";

import { useSetupState } from "~/lib/hooks/setup";
import { setupMachine } from "~/lib/machines/setup";
import { SetupStatus } from "~/routes/setup/-components/status";
import { SetupWizard } from "~/routes/setup/-components/wizard";

export const Route = createFileRoute("/setup/")({
  beforeLoad: async ({ context }) => {
    try {
      await context.authStoreApi.getState().actions.verify(context.subdomain);
    } catch {
      // Continue loading the setup route if the user is unauthenticated
      return;
    }

    // Otherwise, redirect to the dashboard
    throw redirect({
      to: "/",
      search:
        context.resource.AppData.isDev ||
        window.location.hostname === "localhost"
          ? { subdomain: context.subdomain }
          : {},
    });
  },
  loader: async ({ context }) => {
    const isAvailable =
      await context.trpcClient.tenants.public.isSubdomainAvailable.query({
        subdomain: context.subdomain,
      });
    if (!isAvailable)
      throw new Error(`"${context.subdomain}" is unavailable to register.`);

    const SetupMachineContext = createActorContext(setupMachine, {
      input: {
        tenantSubdomain: context.subdomain,
        resource: context.resource,
        trpcClient: context.trpcClient,
      },
    });

    return { SetupMachineContext };
  },
  head: () => ({ meta: [{ title: "Setup | Printdesk" }] }),
  component: RouteComponent,
});

function RouteComponent() {
  const { SetupMachineContext } = Route.useLoaderData();

  return (
    <SetupMachineContext.Provider>
      <Setup />
    </SetupMachineContext.Provider>
  );
}

function Setup() {
  const state = useSetupState();

  if ("wizard" in state) return <SetupWizard />;

  if ("status" in state) return <SetupStatus />;

  throw new SharedErrors.NonExhaustiveValue(state);
}
