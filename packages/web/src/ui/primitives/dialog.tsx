import {
  Dialog as AriaDialog,
  DialogTrigger as AriaDialogTrigger,
  Heading as AriaHeading,
  Modal as AriaModal,
  ModalOverlay as AriaModalOverlay,
  composeRenderProps,
} from "react-aria-components";
import { X } from "lucide-react";

import { IconButton } from "~/app/components/ui/primitives/icon-button";
import { dialogStyles } from "~/styles/components/primitives/dialog";

import type { ComponentProps } from "react";
import type { DialogProps as AriaDialogProps } from "react-aria-components";
import type { DialogStyles } from "~/styles/components/primitives/dialog";

export const DialogTrigger = AriaDialogTrigger;

export const Dialog = AriaDialog;

export type DialogOverlayProps = ComponentProps<typeof AriaModalOverlay>;
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
  children?: AriaDialogProps["children"];
  closeButton?: boolean;
  dialogProps?: ComponentProps<typeof Dialog>;
}
export const DialogContent = ({
  className,
  children,
  side,
  closeButton = true,
  position = "center",
  dialogProps,
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
      {(values) => (
        <>
          {typeof children === "function" ? children(values) : children}

          {closeButton && (
            <IconButton
              onPress={values.close}
              aria-label="Close"
              className="absolute right-3.5 top-3.5"
            >
              <X />
            </IconButton>
          )}
        </>
      )}
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

export type DialogTitleProps = ComponentProps<typeof AriaHeading>;
export const DialogTitle = ({ className, ...props }: DialogTitleProps) => (
  <AriaHeading
    slot="title"
    className={dialogStyles().title({ className })}
    {...props}
  />
);
