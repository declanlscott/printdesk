import {
  FieldError as AriaFieldError,
  Group as AriaGroup,
  Label as AriaLabel,
  Text as AriaText,
  composeRenderProps,
} from "react-aria-components";
import { twMerge } from "tailwind-merge";

import {
  fieldGroupStyles,
  labelStyles,
} from "~/styles/components/primitives/field";
import { composeTwRenderProps } from "~/styles/utils";

import type { ComponentProps } from "react";
import type {
  FieldErrorProps as AriaFieldErrorProps,
  GroupProps as AriaGroupProps,
  LabelProps as AriaLabelProps,
  TextProps as AriaTextProps,
} from "react-aria-components";

export interface LabelProps
  extends AriaLabelProps,
    ComponentProps<typeof AriaLabel> {}
export function Label({ className, ...props }: LabelProps) {
  return <AriaLabel className={labelStyles({ className })} {...props} />;
}

export interface DescriptionProps
  extends AriaTextProps,
    ComponentProps<typeof AriaText> {}
export const Description = ({ className, ...props }: DescriptionProps) => (
  <AriaText
    slot="description"
    className={twMerge("text-muted-foreground text-sm", className)}
    {...props}
  />
);

export interface ErrorMessageProps
  extends AriaTextProps,
    ComponentProps<typeof AriaText> {}
export const ErrorMessage = ({ className, ...props }: ErrorMessageProps) => (
  <AriaText
    slot="errorMessage"
    className={twMerge("text-destructive text-sm font-medium", className)}
    {...props}
  />
);

export interface FieldErrorProps
  extends AriaFieldErrorProps,
    ComponentProps<typeof AriaFieldError> {}
export const FieldError = ({ className, ...props }: FieldErrorProps) => (
  <AriaFieldError
    className={composeTwRenderProps(
      className,
      "text-destructive text-sm font-medium",
    )}
    {...props}
  />
);

export interface FieldGroupProps
  extends AriaGroupProps,
    ComponentProps<typeof AriaGroup> {}
export const FieldGroup = ({ className, ...props }: FieldGroupProps) => (
  <AriaGroup
    className={composeRenderProps(className, (className, renderProps) =>
      fieldGroupStyles({ ...renderProps, className }),
    )}
    {...props}
  />
);
