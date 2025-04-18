import {
  Header as AriaHeader,
  Keyboard as AriaKeyboard,
  Menu as AriaMenu,
  MenuItem as AriaMenuItem,
  MenuSection as AriaMenuSection,
  MenuTrigger as AriaMenuTrigger,
  Popover as AriaPopover,
  Separator as AriaSeparator,
  SubmenuTrigger as AriaSubmenuTrigger,
  composeRenderProps,
} from "react-aria-components";
import { Check, Circle } from "lucide-react";

import { menuStyles } from "~/styles/components/primitives/menu";

import type { ComponentProps } from "react";
import type {
  MenuItemProps as AriaMenuItemProps,
  MenuProps as AriaMenuProps,
  MenuSectionProps as AriaMenuSectionProps,
  MenuTriggerProps as AriaMenuTriggerProps,
  PopoverProps as AriaPopoverProps,
  SeparatorProps as AriaSeparatorProps,
  SubmenuTriggerProps as AriaSubmenuTriggerProps,
} from "react-aria-components";

export interface MenuTriggerProps
  extends AriaMenuTriggerProps,
    ComponentProps<typeof AriaMenuTrigger> {}
export const MenuTrigger = AriaMenuTrigger;

export interface SubmenuTriggerProps
  extends AriaSubmenuTriggerProps,
    ComponentProps<typeof AriaSubmenuTrigger> {}
export const SubmenuTrigger = AriaSubmenuTrigger;

export interface MenuSectionProps<TValue extends object>
  extends AriaMenuSectionProps<TValue>,
    ComponentProps<typeof AriaMenuSection<TValue>> {}
export const MenuSection = AriaMenuSection;

export interface MenuPopoverProps
  extends AriaPopoverProps,
    ComponentProps<typeof AriaPopover> {}
export const MenuPopover = ({
  className,
  offset = 4,
  ...props
}: MenuPopoverProps) => (
  <AriaPopover
    offset={offset}
    className={composeRenderProps(
      className,
      (className, { placement, ...renderProps }) =>
        menuStyles().popover({
          ...renderProps,
          placement: placement ?? undefined,
          className,
        }),
    )}
    {...props}
  />
);

export interface MenuProps<TItem extends object>
  extends AriaMenuProps<TItem>,
    ComponentProps<typeof AriaMenu<TItem>> {}
export const Menu = <TItem extends object>({
  className,
  ...props
}: MenuProps<TItem>) => (
  <AriaMenu
    className={composeRenderProps(className, (className, renderProps) =>
      menuStyles().root({ ...renderProps, className }),
    )}
    {...props}
  />
);

export interface MenuItemProps<TValue extends object>
  extends AriaMenuItemProps<TValue>,
    ComponentProps<typeof AriaMenuItem<TValue>> {
  isInset?: boolean;
}
export const MenuItem = <TValue extends object>({
  className,
  isInset,
  ...props
}: MenuItemProps<TValue>) => (
  <AriaMenuItem
    className={composeRenderProps(className, (className, renderProps) =>
      menuStyles().item({ ...renderProps, isInset, className }),
    )}
    {...props}
  />
);

export interface MenuHeaderProps extends ComponentProps<typeof AriaHeader> {
  isInset?: boolean;
  isSeparator?: boolean;
}
export const MenuHeader = ({
  className,
  isInset,
  isSeparator = false,
  ...props
}: MenuHeaderProps) => (
  <AriaHeader
    className={menuStyles().header({ isInset, isSeparator, className })}
    {...props}
  />
);

export interface MenuSeparatorProps
  extends AriaSeparatorProps,
    ComponentProps<typeof AriaSeparator> {}
export const MenuSeparator = ({ className, ...props }: MenuSeparatorProps) => (
  <AriaSeparator className={menuStyles().separator({ className })} {...props} />
);

export type MenuKeyboardProps = ComponentProps<typeof AriaKeyboard>;
export const MenuKeyboard = ({ className, ...props }: MenuKeyboardProps) => (
  <AriaKeyboard className={menuStyles().keyboard({ className })} {...props} />
);

export interface MenuCheckboxItemProps
  extends AriaMenuItemProps,
    ComponentProps<typeof AriaMenuItem> {}
export const MenuCheckboxItem = ({
  className,
  children,
  ...props
}: MenuCheckboxItemProps) => (
  <AriaMenuItem
    className={composeRenderProps(className, (className, renderProps) =>
      menuStyles().checkboxItem({ ...renderProps, className }),
    )}
    {...props}
  >
    {composeRenderProps(children, (children, { isSelected }) => (
      <>
        <span className="absolute left-2 flex size-4 items-center justify-center">
          {isSelected && <Check className="size-4" />}
        </span>

        {children}
      </>
    ))}
  </AriaMenuItem>
);

export interface MenuRadioItemProps
  extends AriaMenuItemProps,
    ComponentProps<typeof AriaMenuItem> {}
export const MenuRadioItem = ({
  className,
  children,
  ...props
}: MenuRadioItemProps) => (
  <AriaMenuItem
    className={composeRenderProps(className, (className, renderProps) =>
      menuStyles().radioItem({ ...renderProps, className }),
    )}
    {...props}
  >
    {composeRenderProps(children, (children, { isSelected }) => (
      <>
        <span className="absolute left-2 flex size-3.5 items-center justify-center">
          {isSelected && <Circle className="size-2 fill-current" />}
        </span>

        {children}
      </>
    ))}
  </AriaMenuItem>
);
