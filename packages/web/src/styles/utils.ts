import { composeRenderProps } from "react-aria-components";
import { twMerge } from "tailwind-merge";
import { tv } from "tailwind-variants";

export const focusRingStyles = tv({
  base: "outline-none",
  variants: {
    isFocusVisible: {
      true: "ring-2 ring-ring ring-offset-2",
    },
  },
  compoundVariants: [
    {
      variant: "destructive",
      isFocusVisible: true,
      className: "ring-destructive",
    },
    {
      variant: "destructive",
      isFocused: true,
      className: "ring-destructive",
    },
  ],
});

export function composeTwRenderProps<T>(
  className: string | ((v: T) => string) | undefined,
  tw: string,
): string | ((v: T) => string) {
  return composeRenderProps(className, (className) => twMerge(tw, className));
}
