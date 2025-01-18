import { useMemo } from "react";
import { Link as AriaLink } from "react-aria-components";

import logo from "~/assets/logo.svg";
import topography from "~/assets/topography.svg";
import { useRegistrationWizardState } from "~/lib/hooks/registration";
import { Label } from "~/ui/primitives/field";
import { Link } from "~/ui/primitives/link";
import { ProgressBar } from "~/ui/primitives/progress-bar";

import type { PropsWithChildren } from "react";

export function RegistrationWizardLayout(props: PropsWithChildren) {
  const state = useRegistrationWizardState();

  const progress = useMemo(() => {
    const step = state.split("step").slice(-1).at(0);
    if (!step) return NaN;
    if (step.toLowerCase() === "review") return 100;

    return (parseInt(step) / 6) * 100;
  }, [state]);

  return (
    <div className="w-full lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px]">
      <div className="py-12">
        <div className="mx-auto grid max-w-sm gap-6">
          <div className="flex justify-center">
            <AriaLink href={{ to: "/" }}>
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
                <Label>5</Label>
              </div>
            </ProgressBar>
          ) : null}

          {props.children}

          <p className="text-sm">
            Already have an organization? <Link href={{ to: "/" }}>Login</Link>
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
