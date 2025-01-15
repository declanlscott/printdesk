import { tv } from "tailwind-variants";

import { focusRingStyles } from "~/styles/utils";

import type { VariantProps } from "tailwind-variants";

export const disclosureStyles = tv({
  base: "group min-w-64",
  variants: {
    isInGroup: {
      true: "border-0 border-b last:border-b-0",
    },
  },
});
export type DisclosureStyles = VariantProps<typeof disclosureStyles>;

export const disclosureHeaderStyles = tv({
  extend: focusRingStyles,
  base: "group flex flex-1 items-center justify-between rounded-md py-4 font-medium transition-all hover:underline outline-none",
  variants: {
    isDisabled: {
      true: "pointer-events-none opacity-50",
    },
  },
});
export type DisclosureHeaderStyles = VariantProps<
  typeof disclosureHeaderStyles
>;

export const disclosurePanelStyles = tv({
  base: "overflow-hidden text-sm group-data-[expanded]:pb-4 pt-0",
});

export const disclosureGroupStyles = tv({
  base: "",
});
