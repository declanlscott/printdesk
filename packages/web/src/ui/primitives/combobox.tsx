import {
  ComboBox as AriaCombobox,
  Input as AriaInput,
  ListBox as AriaListBox,
  Text as AriaText,
  composeRenderProps,
} from "react-aria-components";
import { ChevronsUpDown } from "lucide-react";

import { Button } from "~/app/components/ui/primitives/button";
import {
  FieldError,
  FieldGroup,
  Label,
} from "~/app/components/ui/primitives/field";
import {
  ListBoxCollection,
  ListBoxHeader,
  ListBoxItem,
  ListBoxSection,
} from "~/app/components/ui/primitives/list-box";
import { Popover } from "~/app/components/ui/primitives/popover";
import {
  comboboxPopoverStyles,
  comboboxStyles,
} from "~/styles/components/primitives/combobox";

import type { ComponentProps } from "react";
import type {
  ListBoxProps as AriaListBoxProps,
  ValidationResult,
} from "react-aria-components";
import type { PopoverProps } from "~/app/components/ui/primitives/popover";

export const BaseCombobox = AriaCombobox;

export const ComboboxItem = ListBoxItem;

export const ComboboxHeader = ListBoxHeader;

export const ComboboxSection = ListBoxSection;

export const ComboboxCollection = ListBoxCollection;

export type ComboboxInputProps = ComponentProps<typeof AriaInput>;
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

export type ComboboxListBoxProps<TItem extends object> =
  AriaListBoxProps<TItem> & ComponentProps<typeof AriaListBox>;
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
  extends Omit<ComponentProps<typeof BaseCombobox>, "children"> {
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
