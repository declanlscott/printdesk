import { useMemo } from "react";
import { Link as AriaLink } from "react-aria-components";
import { ApplicationError } from "@printworks/core/utils/errors";

import logo from "~/assets/logo.svg";
import topography from "~/assets/topography.svg";
import {
  useRegistrationMachine,
  useRegistrationWizardState,
} from "~/lib/hooks/registration";
import { RegistrationWizardReview } from "~/routes/register/-components/wizard/review";
import { RegistrationWizardStep1 } from "~/routes/register/-components/wizard/step-1";
import { RegistrationWizardStep2 } from "~/routes/register/-components/wizard/step-2";
import { RegistrationWizardStep3 } from "~/routes/register/-components/wizard/step-3";
import { RegistrationWizardStep4 } from "~/routes/register/-components/wizard/step-4";
import { Label } from "~/ui/primitives/field";
import { ProgressBar } from "~/ui/primitives/progress-bar";

export function RegistrationWizard() {
  const state = useRegistrationWizardState();
  const slug = useRegistrationMachine().useSelector(
    ({ context }) => context.tenantSlug,
  );

  const progress = useMemo(() => {
    const step = state.split("step").slice(-1).at(0);
    if (!step) return NaN;
    if (step.toLowerCase() === "review") return 100;

    return (parseInt(step) / 5) * 100;
  }, [state]);

  return (
    <div className="w-full lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px]">
      <div className="py-12">
        <div className="mx-auto grid max-w-md gap-6">
          <div className="flex justify-center">
            <AriaLink href={{ to: "/", search: { slug } }}>
              <img src={logo} alt="Printworks" className="size-24" />
            </AriaLink>
          </div>

          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">Register</h1>

            <p className="text-muted-foreground text-balance">
              Register your organization details below.
            </p>
          </div>

          {!isNaN(progress) ? (
            <ProgressBar value={progress} barClassName="h-3">
              <div className="flex w-full justify-evenly pb-2">
                <Label>1</Label>
                <Label>2</Label>
                <Label>3</Label>
                <Label>4</Label>
              </div>
            </ProgressBar>
          ) : null}

          <RegistrationWizardStep />
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

function RegistrationWizardStep() {
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
    case "review":
      return <RegistrationWizardReview />;
    default:
      throw new ApplicationError.NonExhaustiveValue(state);
  }
}
