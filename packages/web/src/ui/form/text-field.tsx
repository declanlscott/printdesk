import { useFieldContext } from "~/lib/contexts/form";
import { TextField } from "~/ui/primitives/text-field";

import type {
  DescriptionProps,
  ErrorMessageProps,
  FieldGroupProps,
  LabelProps,
} from "~/ui/primitives/field";
import type { InputProps } from "~/ui/primitives/input";

export type FormTextFieldProps = {
  labelProps: LabelProps;
  descriptionProps?: DescriptionProps;
  inputProps?: InputProps;
  groupProps?: FieldGroupProps;
  errorMessageProps?: ErrorMessageProps;
};

export function FormTextField(props: FormTextFieldProps) {
  const field = useFieldContext<string>();

  return (
    <TextField
      id={field.name}
      value={field.state.value}
      onChange={field.handleChange}
      onBlur={field.handleBlur}
      {...props}
    />
  );
}
