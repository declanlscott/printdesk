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

export type LabelProps = ComponentProps<typeof AriaLabel>;
export function Label({ className, ...props }: LabelProps) {
  return <AriaLabel className={labelStyles({ className })} {...props} />;
}

export type DescriptionProps = ComponentProps<typeof AriaText>;
export const Description = ({ className, ...props }: DescriptionProps) => (
  <AriaText
    slot="description"
    className={twMerge("text-muted-foreground text-sm", className)}
    {...props}
  />
);

export type FieldErrorProps = ComponentProps<typeof AriaFieldError>;
export const FieldError = ({ className, ...props }: FieldErrorProps) => (
  <AriaFieldError
    className={composeTwRenderProps(className, "text-sm text-red-500")}
    {...props}
  />
);

export type FieldGroupProps = ComponentProps<typeof AriaGroup>;
export const FieldGroup = ({ className, ...props }: FieldGroupProps) => (
  <AriaGroup
    className={composeRenderProps(className, (className, renderProps) =>
      fieldGroupStyles({ ...renderProps, className }),
    )}
    {...props}
  />
);
