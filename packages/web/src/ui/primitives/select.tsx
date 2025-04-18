import {
  Button as AriaButton,
  ListBox as AriaListBox,
  Select as AriaSelect,
  SelectValue as AriaSelectValue,
  composeRenderProps,
} from "react-aria-components";
import { ChevronDown } from "lucide-react";

import {
  selectPopoverStyles,
  selectStyles,
  selectTriggerStyles,
} from "~/styles/components/primitives/select";
import {
  ListBoxCollection,
  ListBoxHeader,
  ListBoxItem,
  ListBoxSection,
} from "~/ui/primitives/list-box";
import { Popover } from "~/ui/primitives/popover";

import type { ComponentProps } from "react";
import type {
  ButtonProps as AriaButtonProps,
  ListBoxProps as AriaListBoxProps,
  SelectProps as AriaSelectProps,
  SelectValueProps as AriaSelectValueProps,
} from "react-aria-components";
import type {
  ListBoxCollectionProps,
  ListBoxHeaderProps,
  ListBoxItemProps,
  ListBoxSectionProps,
} from "~/ui/primitives/list-box";
import type { PopoverProps } from "~/ui/primitives/popover";

export interface SelectProps
  extends AriaSelectProps,
    ComponentProps<typeof AriaSelect> {}
export const Select = AriaSelect;

export type SelectItemProps<TValue extends object> = ListBoxItemProps<TValue>;
export const SelectItem = ListBoxItem;

export type SelectHeaderProps = ListBoxHeaderProps;
export const SelectHeader = ListBoxHeader;

export type SelectSectionProps<TValue extends object> =
  ListBoxSectionProps<TValue>;
export const SelectSection = ListBoxSection;

export type SelectCollectionProps<TItem extends object> =
  ListBoxCollectionProps<TItem>;
export const SelectCollection = ListBoxCollection;

export interface SelectValueProps<TValue extends object>
  extends AriaSelectValueProps<TValue>,
    ComponentProps<typeof AriaSelectValue<TValue>> {}
export const SelectValue = <TValue extends object>({
  className,
  ...props
}: SelectValueProps<TValue>) => (
  <AriaSelectValue
    className={composeRenderProps(className, (className, renderProps) =>
      selectStyles().value({ className, ...renderProps }),
    )}
    {...props}
  />
);

export interface SelectTriggerProps
  extends AriaButtonProps,
    ComponentProps<typeof AriaButton> {}
export const SelectTrigger = ({
  className,
  children,
  ...props
}: SelectTriggerProps) => (
  <AriaButton
    className={composeRenderProps(className, (className, renderProps) =>
      selectTriggerStyles({ className, ...renderProps }),
    )}
    {...props}
  >
    {composeRenderProps(children, (children) => (
      <>
        {children}
        <ChevronDown aria-hidden="true" className="size-4 opacity-50" />
      </>
    ))}
  </AriaButton>
);

export type SelectPopoverProps = PopoverProps;
export const SelectPopover = ({ className, ...props }: SelectPopoverProps) => (
  <Popover
    className={composeRenderProps(
      className,
      (className, { placement, ...renderProps }) =>
        selectPopoverStyles({
          className,
          placement: placement ?? undefined,
          ...renderProps,
        }),
    )}
    {...props}
  />
);

export interface SelectListBoxItemProps<TItem extends object>
  extends AriaListBoxProps<TItem>,
    ComponentProps<typeof AriaListBox<TItem>> {}
export const SelectListBox = <TItem extends object>({
  className,
  ...props
}: AriaListBoxProps<TItem>) => (
  <AriaListBox
    className={composeRenderProps(className, (className, renderProps) =>
      selectStyles().listBox({ className, ...renderProps }),
    )}
    {...props}
  />
);
