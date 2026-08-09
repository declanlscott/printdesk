import * as stylex from "@stylexjs/stylex";
import { Button as ButtonPrimitive } from "react-aria-components";

import { buttonSizes, buttonStyles, buttonVariants } from "../../styles/button";

import type { ButtonProps as ButtonPrimitiveProps } from "react-aria-components";
import type { ButtonStyleProps } from "../../styles/button";

export type ButtonProps = ButtonPrimitiveProps & ButtonStyleProps;

export function Button({ variant = "default", size = "default", sx, ...props }: ButtonProps) {
  return (
    <ButtonPrimitive
      {...stylex.props(buttonStyles.base, buttonVariants[variant], buttonSizes[size], sx)}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      {...props}
    />
  );
}
