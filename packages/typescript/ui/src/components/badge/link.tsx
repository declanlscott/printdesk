import * as stylex from "@stylexjs/stylex";
import { Link } from "react-aria-components";

import { badgeStyles, badgeVariants } from "../../styles/badge";

import type { LinkProps } from "react-aria-components";
import type { BadgeLinkStyleProps } from "../../styles/badge";

export type BadgeProps = LinkProps & BadgeLinkStyleProps;

export function LinkBadge({ variant = "default", sx, ...props }: BadgeProps) {
  return (
    <Link
      {...stylex.props(badgeStyles.base, badgeVariants[variant], sx)}
      data-slot="badge"
      data-variant={variant}
      {...props}
    />
  );
}
