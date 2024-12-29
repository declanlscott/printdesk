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

export const PopoverTrigger = AriaDialogTrigger;

export type PopoverProps = ComponentProps<typeof AriaPopover>;
export const Popover = ({ className, offset = 4, ...props }: PopoverProps) => (
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

export type PopoverDialogProps = ComponentProps<typeof AriaDialog>;
export const PopoverDialog = ({ className, ...props }: PopoverDialogProps) => (
  <AriaDialog className={popoverDialogStyles({ className })} {...props} />
);
