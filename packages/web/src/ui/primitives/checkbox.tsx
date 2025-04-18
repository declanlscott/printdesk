import {
  Checkbox as AriaCheckbox,
  CheckboxGroup as AriaCheckboxGroup,
  composeRenderProps,
} from "react-aria-components";
import { Check, Minus } from "lucide-react";

import {
  boxStyles,
  checkboxStyles,
  checkStyles,
} from "~/styles/components/primitives/checkbox";
import { composeTwRenderProps } from "~/styles/utils";
import { Description, FieldError, Label } from "~/ui/primitives/field";

import type { ComponentProps } from "react";
import type {
  CheckboxGroupProps as AriaCheckboxGroupProps,
  CheckboxProps as AriaCheckboxProps,
  ValidationResult,
} from "react-aria-components";
import type { CheckboxStyles } from "~/styles/components/primitives/checkbox";

export interface CheckboxProps
  extends AriaCheckboxProps,
    ComponentProps<typeof AriaCheckbox>,
    CheckboxStyles {}
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
  extends AriaCheckboxGroupProps,
    ComponentProps<typeof AriaCheckboxGroup> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
}
export const CheckboxGroup = ({
  label,
  description,
  errorMessage,
  className,
  children,
  ...props
}: CheckboxGroupProps) => (
  <AriaCheckboxGroup
    className={composeTwRenderProps(className, "flex flex-col gap-2")}
    {...props}
  >
    {composeRenderProps(children, (children) => (
      <>
        <Label>{label}</Label>

        {children}

        {description && <Description>{description}</Description>}

        {errorMessage && <FieldError>{errorMessage}</FieldError>}
      </>
    ))}
  </AriaCheckboxGroup>
);
