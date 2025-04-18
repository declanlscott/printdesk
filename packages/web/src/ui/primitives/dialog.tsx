import {
  Dialog as AriaDialog,
  DialogTrigger as AriaDialogTrigger,
  Heading as AriaHeading,
  Modal as AriaModal,
  ModalOverlay as AriaModalOverlay,
  composeRenderProps,
} from "react-aria-components";
import { X } from "lucide-react";

import { dialogStyles } from "~/styles/components/primitives/dialog";
import { IconButton } from "~/ui/primitives/icon-button";

import type { ComponentProps } from "react";
import type {
  DialogProps as AriaDialogProps,
  DialogTriggerProps as AriaDialogTriggerProps,
  HeadingProps as AriaHeadingProps,
  ModalOverlayProps as AriaModalOverlayProps,
} from "react-aria-components";
import type { DialogStyles } from "~/styles/components/primitives/dialog";

export interface DialogTriggerProps
  extends AriaDialogTriggerProps,
    ComponentProps<typeof AriaDialogTrigger> {}
export const DialogTrigger = AriaDialogTrigger;

export interface DialogProps
  extends AriaDialogProps,
    ComponentProps<typeof Dialog> {}
export const Dialog = AriaDialog;

export interface DialogOverlayProps
  extends AriaModalOverlayProps,
    ComponentProps<typeof AriaModalOverlay> {}
export const DialogOverlay = ({
  className,
  isDismissable = true,
  ...props
}: DialogOverlayProps) => (
  <AriaModalOverlay
    isDismissable={isDismissable}
    className={composeRenderProps(className, (className, renderProps) =>
      dialogStyles().overlay({ ...renderProps, className }),
    )}
    {...props}
  />
);

export interface DialogContentProps
  extends Omit<ComponentProps<typeof AriaModal>, "children">,
    DialogStyles {
  children?: DialogProps["children"];
  dialogProps?: Omit<DialogProps, "children">;
  closeButton?: boolean;
}
export const DialogContent = ({
  className,
  side,
  children,
  dialogProps,
  closeButton = true,
  position = "center",
  ...props
}: DialogContentProps) => (
  <AriaModal
    className={composeRenderProps(className, (className, renderProps) =>
      side
        ? dialogStyles().sheet({ ...renderProps, side, className })
        : dialogStyles().content({ ...renderProps, position, className }),
    )}
    {...props}
  >
    <Dialog
      {...dialogProps}
      className={dialogStyles().root({
        side,
        className: dialogProps?.className,
      })}
    >
      {composeRenderProps(children, (children, { close }) => (
        <>
          {children}

          {closeButton && (
            <IconButton
              onPress={close}
              aria-label="Close"
              className="absolute right-3.5 top-3.5"
            >
              <X />
            </IconButton>
          )}
        </>
      ))}
    </Dialog>
  </AriaModal>
);

export type DialogHeaderProps = ComponentProps<"div">;
export const DialogHeader = ({ className, ...props }: DialogHeaderProps) => (
  <div className={dialogStyles().header({ className })} {...props} />
);

export type DialogFooterProps = ComponentProps<"div">;
export const DialogFooter = ({ className, ...props }: DialogFooterProps) => (
  <div className={dialogStyles().footer({ className })} {...props} />
);

export interface DialogTitleProps
  extends AriaHeadingProps,
    ComponentProps<typeof AriaHeading> {}
export const DialogTitle = ({ className, ...props }: DialogTitleProps) => (
  <AriaHeading
    slot="title"
    className={dialogStyles().title({ className })}
    {...props}
  />
);
