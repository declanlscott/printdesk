import {
  Button as AriaButton,
  ListBox as AriaListBox,
  Select as AriaSelect,
  SelectValue as AriaSelectValue,
  composeRenderProps,
} from "react-aria-components";
import { ChevronDown } from "lucide-react";

import {
  ListBoxCollection,
  ListBoxHeader,
  ListBoxItem,
  ListBoxSection,
} from "~/app/components/ui/primitives/list-box";
import { Popover } from "~/app/components/ui/primitives/popover";
import {
  selectPopoverStyles,
  selectStyles,
  selectTriggerStyles,
} from "~/styles/components/primitives/select";

import type { ComponentProps } from "react";
import type {
  ListBoxProps as AriaListBoxProps,
  SelectValueProps as AriaSelectValueProps,
} from "react-aria-components";

export const Select = AriaSelect;

export const SelectItem = ListBoxItem;

export const SelectHeader = ListBoxHeader;

export const SelectSection = ListBoxSection;

export const SelectCollection = ListBoxCollection;

export type SelectValueProps<TValue extends object> =
  AriaSelectValueProps<TValue> & ComponentProps<typeof AriaSelectValue>;
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

export type SelectTriggerProps = ComponentProps<typeof AriaButton>;
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

export type SelectPopoverProps = ComponentProps<typeof Popover>;
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

export type SelectListBoxProps<TItem extends object> = AriaListBoxProps<TItem> &
  ComponentProps<typeof AriaListBox>;
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
