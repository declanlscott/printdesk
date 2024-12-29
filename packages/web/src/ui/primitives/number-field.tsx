import {
  Input as AriaInput,
  NumberField as AriaNumberField,
  composeRenderProps,
} from "react-aria-components";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "~/app/components/ui/primitives/button";
import { numberFieldStyles } from "~/styles/components/primitives/number-field";

import type { ComponentProps } from "react";
import type { ButtonProps } from "~/app/components/ui/primitives/button";

export const NumberField = AriaNumberField;

export type NumberFieldInputProps = ComponentProps<typeof AriaInput>;
export const NumberFieldInput = ({
  className,
  ...props
}: NumberFieldInputProps) => (
  <AriaInput
    className={composeRenderProps(className, (className, renderProps) =>
      numberFieldStyles().root({ className, ...renderProps }),
    )}
    {...props}
  />
);

export type NumberFieldSteppersProps = ComponentProps<"div">;
export const NumberFieldSteppers = ({
  className,
  ...props
}: NumberFieldSteppersProps) => (
  <div className={numberFieldStyles().steppers({ className })} {...props}>
    <NumberFieldStepper slot="increment">
      <ChevronUp aria-hidden className="size-4" />
    </NumberFieldStepper>

    <div className="border-b" />

    <NumberFieldStepper slot="decrement">
      <ChevronDown aria-hidden className="size-4" />
    </NumberFieldStepper>
  </div>
);

export type NumberFieldStepperProps = ButtonProps;
export const NumberFieldStepper = ({
  className,
  ...props
}: NumberFieldStepperProps) => (
  <Button
    className={composeRenderProps(className, (className, renderProps) =>
      numberFieldStyles().stepper({ className, ...renderProps }),
    )}
    variant="ghost"
    size="icon"
    {...props}
  />
);
