import { ApplicationError } from "@printworks/core/utils/errors";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { createActorContext } from "@xstate/react";
import * as v from "valibot";

import {
  useRegistrationState,
  useRegistrationStatusState,
  useRegistrationWizardState,
} from "~/lib/hooks/registration";
import { registrationMachine } from "~/lib/machines/registration";
import { RegistrationWizardLayout } from "~/routes/register/-components/wizard/layout";
import { RegistrationWizardReview } from "~/routes/register/-components/wizard/review";
import { RegistrationWizardStep1 } from "~/routes/register/-components/wizard/step-1";
import { RegistrationWizardStep2 } from "~/routes/register/-components/wizard/step-2";
import { RegistrationWizardStep3 } from "~/routes/register/-components/wizard/step-3";
import { RegistrationWizardStep4 } from "~/routes/register/-components/wizard/step-4";
import { RegistrationWizardStep5 } from "~/routes/register/-components/wizard/step-5";

export const Route = createFileRoute("/register/")({
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

    const RegistrationMachineContext = createActorContext(registrationMachine, {
      input: { tenantSlug: slug },
    });

    return { RegistrationMachineContext };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { RegistrationMachineContext } = Route.useLoaderData();

  return (
    <RegistrationMachineContext.Provider>
      <Registration />
    </RegistrationMachineContext.Provider>
  );
}

function Registration() {
  const state = useRegistrationState();

  if ("wizard" in state)
    return (
      <RegistrationWizardLayout>
        <RegistrationWizard />
      </RegistrationWizardLayout>
    );

  if ("status" in state) return <RegistrationStatus />;

  throw new ApplicationError.NonExhaustiveValue(state);
}

function RegistrationWizard() {
  const state = useRegistrationWizardState();

  switch (state) {
    case "step1":
      return <RegistrationWizardStep1 />;
    case "step2":
      return <RegistrationWizardStep2 />;
    case "step3":
      return <RegistrationWizardStep3 />;
    case "step4":
      return <RegistrationWizardStep4 />;
    case "step5":
      return <RegistrationWizardStep5 />;
    case "review":
      return <RegistrationWizardReview />;
    default:
      throw new ApplicationError.NonExhaustiveValue(state);
  }
}

function RegistrationStatus() {
  const state = useRegistrationStatusState();

  switch (state) {
    case "registering":
      return "TODO";
    case "provisioningInfra":
      return "TODO";
    case "waitingForBackend":
      return "TODO";
    case "waitingForPapercutSync":
      return "TODO";
    case "completed":
      return "TODO";
    default:
      throw new ApplicationError.NonExhaustiveValue(state);
  }
}
