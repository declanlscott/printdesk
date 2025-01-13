import { tv } from "tailwind-variants";

import { popoverStyles } from "~/styles/components/primitives/popover";
import { focusRingStyles } from "~/styles/utils";

import type { VariantProps } from "tailwind-variants";

export const selectStyles = tv({
  slots: {
    value: "line-clamp-1 [&>[slot=description]]:hidden",
    listBox:
      "max-h-[inherit] overflow-auto p-1 outline-none [clip-path:inset(0_0_0_0_round_calc(var(--radius)-2px))]",
  },
  variants: {
    isPlaceholder: {
      true: {
        value: "text-muted-foreground",
      },
    },
  },
});
export type SelectStyles = VariantProps<typeof selectStyles>;

export const selectTriggerStyles = tv({
  extend: focusRingStyles,
  base: "border-input bg-background ring-offset-background flex h-10 w-full items-center justify-between rounded-md border px-3 py-2 text-sm",
  variants: {
    isDisabled: {
      true: "cursor-not-allowed opacity-50",
    },
  },
});
export type SelectTriggerStyles = VariantProps<typeof selectTriggerStyles>;

export const selectPopoverStyles = tv({
  extend: popoverStyles,
  base: "w-[--trigger-width]",
});
export type SelectPopoverStyles = VariantProps<typeof selectPopoverStyles>;
