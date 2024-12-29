import {
  Tooltip as AriaTooltip,
  composeRenderProps,
} from "react-aria-components";

import { tooltipStyles } from "~/styles/components/primitives/tooltip";

import type { ComponentProps } from "react";

export { TooltipTrigger } from "react-aria-components";

export type TooltipProps = ComponentProps<typeof AriaTooltip>;
export function Tooltip({ className, offset = 4, ...props }: TooltipProps) {
  return (
    <AriaTooltip
      offset={offset}
      className={composeRenderProps(className, (className, renderProps) =>
        tooltipStyles({ className, ...renderProps }),
      )}
      {...props}
    />
  );
}
