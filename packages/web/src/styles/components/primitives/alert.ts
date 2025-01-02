import { tv } from "tailwind-variants";

import type { VariantProps } from "tailwind-variants";

export const alertStyles = tv({
  base: "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  variants: {
    variant: {
      default: "bg-background text-foreground",
      destructive:
        "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});
export type AlertStyles = VariantProps<typeof alertStyles>;

export const alertTitleStyles = tv({
  base: "mb-1 font-medium leading-none tracking-tight",
});

export const alertDescriptionStyles = tv({
  base: "text-sm [&_p]:leading-relaxed",
});
