import { Separator as AriaSeparator } from "react-aria-components";

import { separatorStyles } from "~/styles/components/primitives/separator";

import type { ComponentProps } from "react";
import type { SeparatorProps as AriaSeparatorProps } from "react-aria-components";

export interface SeparatorProps
  extends AriaSeparatorProps,
    ComponentProps<typeof AriaSeparator> {}

export const Separator = ({
  className,
  orientation = "horizontal",
  ...props
}: SeparatorProps) => (
  <AriaSeparator
    orientation={orientation}
    className={separatorStyles({ orientation, className })}
    {...props}
  />
);
