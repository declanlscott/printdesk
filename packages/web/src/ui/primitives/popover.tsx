import {
  Dialog as AriaDialog,
  DialogTrigger as AriaDialogTrigger,
  Popover as AriaPopover,
  composeRenderProps,
} from "react-aria-components";

import {
  popoverDialogStyles,
  popoverStyles,
} from "~/styles/components/primitives/popover";

import type { ComponentProps } from "react";
import type {
  DialogProps as AriaDialogProps,
  PopoverProps as AriaPopoverProps,
} from "react-aria-components";

export const PopoverTrigger = AriaDialogTrigger;

export interface PopoverProps
  extends AriaPopoverProps,
    ComponentProps<typeof AriaPopover> {}
export const Popover = ({
  className,
  offset = 4,
  ...props
}: AriaPopoverProps) => (
  <AriaPopover
    offset={offset}
    className={composeRenderProps(
      className,
      (className, { placement, ...renderProps }) =>
        popoverStyles({
          className,
          placement: placement ?? undefined,
          ...renderProps,
        }),
    )}
    {...props}
  />
);

export interface PopoverDialogProps
  extends AriaDialogProps,
    ComponentProps<typeof AriaDialog> {}
export const PopoverDialog = ({ className, ...props }: PopoverDialogProps) => (
  <AriaDialog className={popoverDialogStyles({ className })} {...props} />
);
