import { tv } from "tailwind-variants";

import { buttonStyles } from "~/styles/components/primitives/button";

import type { VariantProps } from "tailwind-variants";

export const linkStyles = tv({
  extend: buttonStyles,
  defaultVariants: {
    variant: "link",
  },
  compoundVariants: [
    {
      variant: "link",
      className: "p-0 h-fit",
    },
  ],
});

export type LinkStyles = VariantProps<typeof linkStyles>;
