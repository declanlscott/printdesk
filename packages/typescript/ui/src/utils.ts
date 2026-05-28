import { composeRenderProps } from "react-aria-components";
import { twMerge } from "tailwind-merge";
import { tv } from "tailwind-variants";

export const focusRing = tv({
  base: "outline-none aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  variants: {
    isFocusVisible: {
      true: "border-ring ring-ring/50 ring-[3px]",
    },
  },
  compoundVariants: [
    {
      variant: "destructive",
      isFocusVisible: true,
      className: "ring-destructive/20 dark:ring-destructive/40",
    },
  ],
});

export function composeTailwindRenderProps<T>(
  className: string | ((v: T) => string) | undefined,
  tw: string,
): string | ((v: T) => string) {
  return composeRenderProps(className, (className) => twMerge(tw, className));
}
