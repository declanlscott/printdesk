import { Input as AriaInput, composeRenderProps } from "react-aria-components";

import { inputStyles } from "~/styles/components/primitives/input";

import type { ComponentProps } from "react";
import type { InputProps as AriaInputProps } from "react-aria-components";
import type { InputStyles } from "~/styles/components/primitives/input";

export interface InputProps
  extends AriaInputProps,
    ComponentProps<typeof AriaInput>,
    InputStyles {}

export const Input = ({ className, ...props }: InputProps) => (
  <AriaInput
    {...props}
    className={composeRenderProps(className, (className, renderProps) =>
      inputStyles({ className, ...renderProps }),
    )}
  />
);
