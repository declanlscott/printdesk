import { badgeStyles } from "~/styles/components/primitives/badge";

import type { ComponentProps } from "react";
import type { BadgeStyles } from "~/styles/components/primitives/badge";

export interface BadgeProps extends ComponentProps<"div">, BadgeStyles {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={badgeStyles({ variant, className })} {...props} />;
}
