import {
  Checkbox as AriaCheckbox,
  CheckboxGroup as AriaCheckboxGroup,
  composeRenderProps,
} from "react-aria-components";
import { Check, Minus } from "lucide-react";

import {
  Description,
  FieldError,
  Label,
} from "~/app/components/ui/primitives/field";
import {
  boxStyles,
  checkboxStyles,
  checkStyles,
} from "~/styles/components/primitives/checkbox";
import { composeTwRenderProps } from "~/styles/utils";

import type { ComponentProps, ReactNode } from "react";
import type { ValidationResult } from "react-aria-components";
import type { CheckboxStyles } from "~/styles/components/primitives/checkbox";

export interface CheckboxProps
  extends Omit<ComponentProps<typeof AriaCheckbox>, "children">,
    CheckboxStyles {
  children: ReactNode;
}
export const Checkbox = (props: CheckboxProps) => (
  <AriaCheckbox
    {...props}
    className={composeRenderProps(props.className, (className, renderProps) =>
      checkboxStyles({ ...renderProps, className }),
    )}
  >
    {({ isSelected, isIndeterminate, ...renderProps }) => (
      <>
        <div
          className={boxStyles({
            isSelected: isSelected || isIndeterminate,
            ...renderProps,
          })}
        >
          {isIndeterminate ? (
            <Minus aria-hidden className={checkStyles} />
          ) : isSelected ? (
            <Check aria-hidden className={checkStyles} />
          ) : null}
        </div>

        {props.children}
      </>
    )}
  </AriaCheckbox>
);

export interface CheckboxGroupProps
  extends Omit<ComponentProps<typeof AriaCheckboxGroup>, "children"> {
  children?: ReactNode;
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
}
export const CheckboxGroup = ({ className, ...props }: CheckboxGroupProps) => (
  <AriaCheckboxGroup
    className={composeTwRenderProps(className, "flex flex-col gap-2")}
    {...props}
  >
    <Label>{props.label}</Label>

    {props.children}

    {props.description && <Description>{props.description}</Description>}

    <FieldError>{props.errorMessage}</FieldError>
  </AriaCheckboxGroup>
);
