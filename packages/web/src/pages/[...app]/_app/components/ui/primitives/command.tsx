import {
  Button as AriaButton,
  composeRenderProps,
} from "react-aria-components";
import { Command as CommandPrimitive } from "cmdk";
import { ArrowLeft, Search } from "lucide-react";

import { Dialog, DialogContent } from "~/app/components/ui/primitives/dialog";
import {
  commandBackButtonStyles,
  commandStyles,
} from "~/styles/components/primitives/command";

import type { ComponentProps, DetailedHTMLProps, HTMLAttributes } from "react";

export type CommandProps = ComponentProps<typeof CommandPrimitive>;
export const Command = ({ className, ...props }: CommandProps) => (
  <CommandPrimitive
    className={commandStyles().root({ className })}
    {...props}
  />
);

export interface CommandDialogProps extends ComponentProps<typeof Dialog> {
  commandProps?: CommandProps;
  dialogContentProps?: ComponentProps<typeof DialogContent>;
}
export const CommandDialog = ({
  children,
  commandProps,
  dialogContentProps,
  ...props
}: CommandDialogProps) => {
  return (
    <Dialog {...props}>
      <DialogContent
        className="overflow-hidden p-0 shadow-lg"
        position="top"
        {...dialogContentProps}
      >
        {(values) => (
          <Command
            {...commandProps}
            className={commandStyles().dialogContent({
              className: commandProps?.className,
            })}
          >
            {typeof children === "function" ? children(values) : children}
          </Command>
        )}
      </DialogContent>
    </Dialog>
  );
};

export interface CommandInputProps
  extends ComponentProps<typeof CommandPrimitive.Input> {
  back?: {
    buttonProps: ComponentProps<typeof AriaButton>;
  };
}
export const CommandInput = ({
  className,
  back,
  ...props
}: CommandInputProps) => (
  <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
    {back ? (
      <AriaButton
        {...back.buttonProps}
        className={composeRenderProps(
          back.buttonProps.className,
          (className, renderProps) =>
            commandBackButtonStyles({ ...renderProps, className }),
        )}
      >
        <ArrowLeft className="size-4" />
      </AriaButton>
    ) : (
      <Search className="mr-2 size-4 shrink-0 opacity-50" />
    )}

    <CommandPrimitive.Input
      className={commandStyles().input({ className })}
      {...props}
    />
  </div>
);

export type CommandListProps = ComponentProps<typeof CommandPrimitive.List>;
export const CommandList = ({ className, ...props }: CommandListProps) => (
  <CommandPrimitive.List
    className={commandStyles().list({ className })}
    {...props}
  />
);

export type CommandEmptyProps = ComponentProps<typeof CommandPrimitive.Empty>;
export const CommandEmpty = (props: CommandEmptyProps) => (
  <CommandPrimitive.Empty className="py-6 text-center text-sm" {...props} />
);

export type CommandGroupProps = ComponentProps<typeof CommandPrimitive.Group>;
export const CommandGroup = ({ className, ...props }: CommandGroupProps) => (
  <CommandPrimitive.Group
    className={commandStyles().group({ className })}
    {...props}
  />
);

export type CommandSeparatorProps = ComponentProps<
  typeof CommandPrimitive.Separator
>;
export const CommandSeparator = ({
  className,
  ...props
}: CommandSeparatorProps) => (
  <CommandPrimitive.Separator
    className={commandStyles().separator({ className })}
    {...props}
  />
);

export type CommandItemProps = ComponentProps<typeof CommandPrimitive.Item>;
export const CommandItem = ({ className, ...props }: CommandItemProps) => (
  <CommandPrimitive.Item
    className={commandStyles().item({ className })}
    {...props}
  />
);

export type CommandShortcutProps = DetailedHTMLProps<
  HTMLAttributes<HTMLSpanElement>,
  HTMLSpanElement
>;
export const CommandShortcut = ({
  className,
  ...props
}: CommandShortcutProps) => (
  <span className={commandStyles().shortcut({ className })} {...props} />
);
