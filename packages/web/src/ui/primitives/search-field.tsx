import { SearchField as AriaSearchField } from "react-aria-components";

import { FieldGroup, Label } from "~/ui/primitives/field";
import { Input } from "~/ui/primitives/input";

import type { SearchFieldProps as AriaSearchFieldProps } from "react-aria-components";
import type {
  DescriptionProps,
  FieldGroupProps,
  LabelProps,
} from "~/ui/primitives/field";
import type { InputProps } from "~/ui/primitives/input";

export interface SearchFieldProps extends AriaSearchFieldProps {
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
      {(values) => (
        <>
          <Input {...inputProps} />

          {typeof groupProps.children === "function"
            ? groupProps.children(values)
            : groupProps.children}
        </>
      )}
    </FieldGroup>
  </AriaSearchField>
);
