import {
  Tooltip as AriaTooltip,
  TooltipTrigger as AriaTooltipTrigger,
  composeRenderProps,
} from "react-aria-components";

import { tooltipStyles } from "~/styles/components/primitives/tooltip";

import type { ComponentProps } from "react";
import type {
  TooltipProps as AriaTooltipProps,
  TooltipTriggerComponentProps,
} from "react-aria-components";

export interface TooltipTriggerProps
  extends TooltipTriggerComponentProps,
    ComponentProps<typeof AriaTooltipTrigger> {}
export const TooltipTrigger = AriaTooltipTrigger;

export interface TooltipProps
  extends AriaTooltipProps,
    ComponentProps<typeof AriaTooltip> {}
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
