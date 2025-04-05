import { useFormContext } from "~/lib/contexts/form";
import { Button } from "~/ui/primitives/button";

import type { ButtonProps } from "~/ui/primitives/button";

export type SubmitButtonProps = ButtonProps;

export function SubmitButton(props: SubmitButtonProps) {
  const form = useFormContext();

  return (
    <form.Subscribe
      selector={({ canSubmit, isSubmitting }) => ({
        canSubmit,
        isSubmitting,
      })}
    >
      {({ canSubmit, isSubmitting }) => (
        <Button
          type="submit"
          className="gap-2"
          {...props}
          isDisabled={!canSubmit || props.isDisabled}
          isLoading={isSubmitting || props.isLoading}
        />
      )}
    </form.Subscribe>
  );
}
