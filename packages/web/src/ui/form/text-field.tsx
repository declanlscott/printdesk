import { useFieldContext } from "~/lib/contexts/form";
import { TextField } from "~/ui/primitives/text-field";

import type { TextFieldProps } from "~/ui/primitives/text-field";

export type FormTextFieldProps = TextFieldProps;

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
