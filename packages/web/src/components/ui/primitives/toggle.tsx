import {
  ToggleButton as AriaToggleButton,
  composeRenderProps,
} from "react-aria-components";

import { toggleStyles } from "~/styles/components/primitives/toggle";

import type { ComponentProps } from "react";
import type { ToggleStyles } from "~/styles/components/primitives/toggle";

export interface ToggleProps
  extends ComponentProps<typeof AriaToggleButton>,
    ToggleStyles {}

export const Toggle = ({ className, ...props }: ToggleProps) => (
  <AriaToggleButton
    className={composeRenderProps(className, (className, renderProps) =>
      toggleStyles({ className, ...renderProps }),
    )}
    {...props}
  />
);
