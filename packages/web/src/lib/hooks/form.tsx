import { createFormHook } from "@tanstack/react-form";

import { fieldContext, formContext } from "~/lib/contexts/form";
import { SubmitButton } from "~/ui/form/submit-button";
import { FormTextField } from "~/ui/form/text-field";

export const { useAppForm, withForm } = createFormHook({
  fieldComponents: { TextField: FormTextField },
  formComponents: { SubmitButton },
  fieldContext,
  formContext,
});
