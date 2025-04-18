import {
  Group as AriaGroup,
  TextField as AriaTextField,
  composeRenderProps,
} from "react-aria-components";

import { Description, ErrorMessage, Label } from "~/ui/primitives/field";
import { Input } from "~/ui/primitives/input";

import type { ComponentProps } from "react";
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

export interface TextFieldProps
  extends AriaTextFieldProps,
    ComponentProps<typeof AriaTextField> {
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

    <AriaGroup {...groupProps}>
      {composeRenderProps(groupProps.children, (children) => (
        <>
          <Input {...inputProps} />

          {children}
        </>
      ))}
    </AriaGroup>

    {errorMessageProps?.children ? (
      <ErrorMessage {...errorMessageProps} />
    ) : null}
  </AriaTextField>
);
