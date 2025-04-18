import {
  ComboBox as AriaCombobox,
  Input as AriaInput,
  ListBox as AriaListBox,
  Text as AriaText,
  composeRenderProps,
} from "react-aria-components";
import { ChevronsUpDown } from "lucide-react";

import {
  comboboxPopoverStyles,
  comboboxStyles,
} from "~/styles/components/primitives/combobox";
import { Button } from "~/ui/primitives/button";
import { FieldError, FieldGroup, Label } from "~/ui/primitives/field";
import {
  ListBoxCollection,
  ListBoxHeader,
  ListBoxItem,
  ListBoxSection,
} from "~/ui/primitives/list-box";
import { Popover } from "~/ui/primitives/popover";

import type { ComponentProps } from "react";
import type {
  ComboBoxProps as AriaComboboxProps,
  ListBoxProps as AriaListBoxProps,
  InputProps,
  ListBoxSectionProps,
  ValidationResult,
} from "react-aria-components";
import type {
  ListBoxCollectionProps,
  ListBoxHeaderProps,
  ListBoxItemProps,
} from "~/ui/primitives/list-box";
import type { PopoverProps } from "~/ui/primitives/popover";

export interface BaseComboboxProps<TItem extends object>
  extends AriaComboboxProps<TItem>,
    ComponentProps<typeof AriaCombobox<TItem>> {}
export const BaseCombobox = AriaCombobox;

export type ComboboxItemProps<TValue extends object> = ListBoxItemProps<TValue>;
export const ComboboxItem = ListBoxItem;

export type ComboboxHeaderProps = ListBoxHeaderProps;
export const ComboboxHeader = ListBoxHeader;

export type ComboboxSectionProps<TValue extends object> =
  ListBoxSectionProps<TValue>;
export const ComboboxSection = ListBoxSection;

export type ComboboxCollectionProps<TItem extends object> =
  ListBoxCollectionProps<TItem>;
export const ComboboxCollection = ListBoxCollection;

export interface ComboboxInputProps
  extends InputProps,
    ComponentProps<typeof AriaInput> {}
export const ComboboxInput = ({ className, ...props }: ComboboxInputProps) => (
  <AriaInput
    className={composeRenderProps(className, (className, renderProps) =>
      comboboxStyles().input({ className, ...renderProps }),
    )}
    {...props}
  />
);

export type ComboboxPopoverProps = PopoverProps;
export const ComboboxPopover = ({
  className,
  ...props
}: ComboboxPopoverProps) => (
  <Popover
    className={composeRenderProps(
      className,
      (className, { placement, ...renderProps }) =>
        comboboxPopoverStyles({
          className,
          placement: placement ?? undefined,
          ...renderProps,
        }),
    )}
    {...props}
  />
);

export interface ComboboxListBoxProps<TItem extends object>
  extends AriaListBoxProps<TItem>,
    ComponentProps<typeof AriaListBox<TItem>> {}
export const ComboboxListBox = <TItem extends object>({
  className,
  ...props
}: ComboboxListBoxProps<TItem>) => (
  <AriaListBox
    className={composeRenderProps(className, (className, renderProps) =>
      comboboxStyles().listBox({ className, ...renderProps }),
    )}
    {...props}
  />
);

export interface ComboboxProps<TItem extends object>
  extends Omit<BaseComboboxProps<TItem>, "children"> {
  label?: string;
  description?: string | null;
  errorMessage?: string | ((validation: ValidationResult) => string);
  children: ComboboxListBoxProps<TItem>["children"];
}
export const Combobox = <TItem extends object>({
  label,
  description,
  errorMessage,
  className,
  children,
  ...props
}: ComboboxProps<TItem>) => (
  <BaseCombobox
    className={composeRenderProps(className, (className, renderProps) =>
      comboboxStyles().root({ className, ...renderProps }),
    )}
    {...props}
  >
    <Label>{label}</Label>

    <FieldGroup className="p-0">
      <ComboboxInput />

      <Button variant="ghost" size="icon" className="mr-1 size-6 p-1">
        <ChevronsUpDown aria-hidden="true" className="size-4 opacity-50" />
      </Button>
    </FieldGroup>

    {description && (
      <AriaText className="text-muted-foreground text-sm" slot="description">
        {description}
      </AriaText>
    )}

    <FieldError>{errorMessage}</FieldError>

    <ComboboxPopover>
      <ComboboxListBox>{children}</ComboboxListBox>
    </ComboboxPopover>
  </BaseCombobox>
);
