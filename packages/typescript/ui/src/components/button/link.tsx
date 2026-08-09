import * as stylex from "@stylexjs/stylex";
import { Link } from "react-aria-components";

import { buttonSizes, buttonStyles, buttonVariants } from "../../styles/button";

import type { LinkProps } from "react-aria-components";
import type { LinkButtonStyleProps } from "../../styles/button";

export type LinkButtonProps = LinkProps & LinkButtonStyleProps;

export function LinkButton({
  variant = "default",
  size = "default",
  sx,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      {...stylex.props(buttonStyles.base, buttonVariants[variant], buttonSizes[size], sx)}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      {...props}
    />
  );
}
