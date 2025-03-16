import { tv } from "tailwind-variants";

import { focusRingStyles } from "~/styles/utils";

import type { VariantProps } from "tailwind-variants";

export const textAreaStyles = tv({
  extend: focusRingStyles,
  base: "bg-background flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm",
  variants: {
    variant: {
      default: "border-input placeholder:text-muted-foreground",
      destructive:
        "border-destructive text-destructive placeholder:text-destructive/50",
    },
    isDisabled: {
      true: "cursor-not-allowed opacity-50",
    },
  },
});
export type TextAreaStyles = VariantProps<typeof textAreaStyles>;
