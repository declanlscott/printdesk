import { tv } from "tailwind-variants";

import { focusRing } from "../utils";

import type { VariantProps } from "tailwind-variants";

export const button = tv({
  extend: focusRing,
  base: "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 cursor-pointer pressed:scale-95 corner-squircle",
  variants: {
    variant: {
      default:
        "bg-primary text-primary-foreground hover:bg-primary/90 pressed:bg-primary/80 stroke-primary-foreground",
      destructive:
        "bg-destructive text-white hover:bg-destructive/90 dark:bg-destructive/60 pressed:bg-destructive/80 dark:pressed:bg-destructive/50 stroke-white",
      outline:
        "border bg-background shadow-xs hover:bg-accent/70 hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 pressed:bg-accent dark:pressed:bg-input/30 stroke-foreground",
      secondary:
        "bg-secondary text-secondary-foreground hover:bg-secondary/80 pressed:bg-secondary/60 stroke-secondary-foreground",
      ghost:
        "hover:bg-accent/70 hover:text-accent-foreground dark:hover:bg-accent/50 pressed:bg-accent dark:pressed:bg-accent/30 stroke-foreground",
      link: "text-primary underline-offset-4 hover:underline stroke-primary pressed:scale-100",
    },
    size: {
      default: "h-9 px-4 py-2 has-[>svg]:px-3",
      sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
      lg: "h-10 px-6 has-[>svg]:px-4",
      icon: "size-9",
      "icon-sm": "size-8",
      "icon-lg": "size-10",
    },
    isDisabled: {
      true: "pointer-events-none opacity-50",
    },
    isPending: {
      true: "text-transparent",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

export type ButtonVariantProps = VariantProps<typeof button>;
