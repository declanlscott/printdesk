import * as stylex from "@stylexjs/stylex";
import { Link } from "react-aria-components";

import { buttonSizes, buttonStyles, buttonVariants } from "../styles/button";

import type { LinkProps } from "react-aria-components";
import type { ButtonStyleProps } from "../styles/button";

export type LinkButtonProps = LinkProps & ButtonStyleProps;

export function LinkButton({ variant = "default", size = "default", ...props }: LinkButtonProps) {
  return (
    <Link
      {...stylex.props(buttonStyles.base, buttonVariants[variant], buttonSizes[size])}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      {...props}
    />
  );
}
