import {
  SearchField as AriaSearchField,
  composeRenderProps,
} from "react-aria-components";

import { FieldGroup, Label } from "~/ui/primitives/field";
import { Input } from "~/ui/primitives/input";

import type { ComponentProps } from "react";
import type { SearchFieldProps as AriaSearchFieldProps } from "react-aria-components";
import type {
  DescriptionProps,
  FieldGroupProps,
  LabelProps,
} from "~/ui/primitives/field";
import type { InputProps } from "~/ui/primitives/input";

export interface SearchFieldProps
  extends AriaSearchFieldProps,
    ComponentProps<typeof AriaSearchField> {
  labelProps?: LabelProps;
  descriptionProps?: DescriptionProps;
  inputProps?: InputProps;
  groupProps?: FieldGroupProps;
}

export const SearchField = ({
  labelProps,
  inputProps = {},
  groupProps = {},
  ...props
}: SearchFieldProps) => (
  <AriaSearchField {...props}>
    {labelProps ? <Label {...labelProps} /> : null}

    <FieldGroup {...groupProps}>
      {composeRenderProps(groupProps.children, (children) => (
        <>
          <Input {...inputProps} />

          {children}
        </>
      ))}
    </FieldGroup>
  </AriaSearchField>
);
