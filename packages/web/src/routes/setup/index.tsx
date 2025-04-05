import { SharedErrors } from "@printworks/core/errors/shared";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { createActorContext } from "@xstate/react";
import * as v from "valibot";

import { useSetupState } from "~/lib/hooks/setup";
import { setupMachine } from "~/lib/machines/setup";
import { SetupStatus } from "~/routes/setup/-components/status";
import { SetupWizard } from "~/routes/setup/-components/wizard";

export const Route = createFileRoute("/setup/")({
  validateSearch: v.object({ slug: v.optional(v.string()) }),
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
    if (!slug) throw new Error("Missing slug");

    const isAvailable = await context.trpcClient.tenants.isSlugAvailable.query({
      slug,
    });
    if (!isAvailable) throw new Error(`"${slug}" is unavailable to register.`);

    const SetupMachineContext = createActorContext(setupMachine, {
      input: {
        tenantSlug: slug,
        resource: context.resource,
        trpcClient: context.trpcClient,
      },
    });

    return { SetupMachineContext };
  },
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
