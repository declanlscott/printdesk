import { useMemo } from "react";
import { Link as AriaLink } from "react-aria-components";
import { SharedErrors } from "@printworks/core/errors/shared";

import logo from "~/assets/logo.svg";
import topography from "~/assets/topography.svg";
import { useSetupMachine, useSetupWizardState } from "~/lib/hooks/setup";
import { SetupWizardReview } from "~/routes/setup/-components/wizard/review";
import { SetupWizardStep1 } from "~/routes/setup/-components/wizard/step-1";
import { SetupWizardStep2 } from "~/routes/setup/-components/wizard/step-2";
import { SetupWizardStep3 } from "~/routes/setup/-components/wizard/step-3";
import { SetupWizardStep4 } from "~/routes/setup/-components/wizard/step-4";
import { Label } from "~/ui/primitives/field";
import { ProgressBar } from "~/ui/primitives/progress-bar";

export function SetupWizard() {
  const state = useSetupWizardState();
  const slug = useSetupMachine().useSelector(
    ({ context }) => context.tenantSlug,
  );

  const progress = useMemo(() => {
    const step = state.split("step").slice(-1).at(0);
    if (!step) return NaN;
    if (step === "isLicenseKeyAvailable") return 20;
    if (step === "review") return 100;

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
            <h1 className="text-3xl font-bold">Setup</h1>

            <p className="text-muted-foreground text-balance">
              Enter your organization details to get started.
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

          <SetupWizardStep />
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

function SetupWizardStep() {
  const state = useSetupWizardState();

  switch (state) {
    case "step1":
    case "isLicenseKeyAvailable":
      return <SetupWizardStep1 />;
    case "step2":
      return <SetupWizardStep2 />;
    case "step3":
      return <SetupWizardStep3 />;
    case "step4":
      return <SetupWizardStep4 />;
    case "review":
      return <SetupWizardReview />;
    default:
      throw new SharedErrors.NonExhaustiveValue(state);
  }
}
