import { tv } from "tailwind-variants";

import type { VariantProps } from "tailwind-variants";

export const spinnerStyles = tv({
  base: "animate-spin",
});

export type SpinnerStyles = VariantProps<typeof spinnerStyles>;
