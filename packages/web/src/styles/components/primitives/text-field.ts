import { tv } from "tailwind-variants";

import { focusRingStyles } from "~/styles/utils";

import type { VariantProps } from "tailwind-variants";

export const inputStyles = tv({
  extend: focusRingStyles,
  base: "flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium",
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
  defaultVariants: {
    variant: "default",
  },
});
export type InputStyles = VariantProps<typeof inputStyles>;

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
