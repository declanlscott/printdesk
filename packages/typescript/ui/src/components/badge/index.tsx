import * as stylex from "@stylexjs/stylex";

import { badgeStyles, badgeVariants } from "../../styles/badge";

import type { BadgeStyleProps } from "../../styles/badge";

export type BadgeProps = BadgeStyleProps;

export function Badge({ variant = "default", sx, ...props }: BadgeProps) {
  return (
    <span
      {...stylex.props(badgeStyles.base, badgeVariants[variant], sx)}
      data-slot="badge"
      data-variant={variant}
      {...props}
    />
  );
}
