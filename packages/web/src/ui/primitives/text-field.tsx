import {
  TextField as AriaTextField,
  Input,
  Label,
} from "react-aria-components";

import { Description, ErrorMessage, FieldGroup } from "~/ui/primitives/field";

import type {
  TextFieldProps as AriaTextFieldProps,
  InputProps,
  LabelProps,
} from "react-aria-components";
import type {
  DescriptionProps,
  ErrorMessageProps,
  FieldGroupProps,
} from "~/ui/primitives/field";

export interface TextFieldProps extends AriaTextFieldProps {
  labelProps: LabelProps;
  descriptionProps?: DescriptionProps;
  inputProps?: InputProps;
  groupProps?: FieldGroupProps;
  errorMessageProps?: ErrorMessageProps;
}

export const TextField = ({
  labelProps,
  descriptionProps,
  inputProps = {},
  groupProps = {},
  errorMessageProps,
  ...props
}: TextFieldProps) => (
  <AriaTextField {...props}>
    <Label {...labelProps} />

    {descriptionProps ? <Description {...descriptionProps} /> : null}

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

    {errorMessageProps ? <ErrorMessage {...errorMessageProps} /> : null}
  </AriaTextField>
);
