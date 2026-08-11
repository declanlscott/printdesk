import * as stylex from "@stylexjs/stylex";

import { colors, fontSizes, leading, radii, spacing, timing } from "./tokens.stylex";

import type { StyleXComponentProps } from "./types";

const ARIA_EXPANDED = '[aria-expanded="true"]';
const ARIA_INVALID = '[aria-invalid="true"]';
const DISABLED = ":disabled";
const FOCUS_VISIBLE = ":focus-visible";
const HOVER = ":hover";

export const buttonStyles = stylex.create({
  base: {
    display: "inline-flex",
    flexShrink: 0,
    alignItems: "center",
    justifyItems: "center",
    borderRadius: radii.lg,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: {
      default: "transparent",
      [FOCUS_VISIBLE]: colors.ring,
      [ARIA_EXPANDED]: colors.destructive,
    },
    boxShadow: {
      default: null,
      [FOCUS_VISIBLE]: `0 0 0 3px color-mix(in oklab, ${colors.ring} 50%, transparent)`,
      [ARIA_INVALID]: `0 0 0 3px light-dark(color-mix(in oklab, ${colors.destructive} 20%, transparent), color-mix(in oklab, ${colors.destructive} 40%, transparent))`,
    },
    backgroundClip: "padding-box",
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
    fontWeight: "500",
    whiteSpace: "nowrap",
    transitionProperty: "all",
    transitionTimingFunction: timing.easeInOut,
    transitionDuration: timing[150],
    outline: "none",
    userSelect: "none",
    opacity: {
      default: null,
      [DISABLED]: 0.5,
    },
    translate: {
      default: null,
      ':active:not([aria-haspopup="true"])': "0 1px",
    },
    pointerEvents: {
      default: null,
      [DISABLED]: "none",
    },
    cursor: {
      default: "pointer",
      [DISABLED]: "not-allowed",
    },
  },
});

export const buttonVariants = stylex.create({
  default: {
    backgroundColor: {
      default: colors.primary,
      [HOVER]: `color-mix(in oklab, ${colors.primary} 80%, transparent)`,
    },
    color: colors.primaryForeground,
  },
  outline: {
    borderColor: {
      default: `light-dark(${colors.border}, ${colors.input})`,
      [FOCUS_VISIBLE]: colors.ring,
      [ARIA_EXPANDED]: colors.destructive,
    },
    backgroundColor: {
      default: `light-dark(${colors.background}, color-mix(in oklab, ${colors.input} 30%, transparent))`,
      [HOVER]: `light-dark(${colors.muted}, color-mix(in oklab, ${colors.input} 50%, transparent))`,
      [ARIA_EXPANDED]: colors.muted,
    },
    color: {
      default: null,
      [HOVER]: colors.foreground,
      [ARIA_EXPANDED]: colors.foreground,
    },
  },
  secondary: {
    backgroundColor: {
      default: colors.secondary,
      [HOVER]: `color-mix(in oklch, ${colors.secondary}, ${colors.foreground} 5%)`,
      [ARIA_EXPANDED]: colors.secondary,
    },
    color: {
      default: colors.secondaryForeground,
      [ARIA_EXPANDED]: colors.secondaryForeground,
    },
  },
  ghost: {
    backgroundColor: {
      default: null,
      [HOVER]: `light-dark(${colors.muted}, color-mix(in oklab, ${colors.muted} 50%, transparent))`,
    },
    color: {
      default: null,
      [HOVER]: colors.foreground,
      [ARIA_EXPANDED]: colors.foreground,
    },
  },
  destructive: {
    backgroundColor: {
      default: `light-dark(color-mix(in oklab, ${colors.destructive} 10%, transparent), color-mix(in oklab, ${colors.destructive} 20%, transparent))`,
      [HOVER]: `light-dark(color-mix(in oklab, ${colors.destructive} 20%, transparent), color-mix(in oklab, ${colors.destructive} 30%, transparent))`,
    },
    color: colors.destructive,
    borderColor: {
      default: "transparent",
      [FOCUS_VISIBLE]: `color-mix(in oklab, ${colors.destructive} 40%, transparent)`,
    },
    boxShadow: {
      default: null,
      [FOCUS_VISIBLE]: `0 0 0 3px light-dark(color-mix(in oklab, ${colors.destructive} 20%, transparent), color-mix(in oklab, ${colors.destructive} 40%, transparent))`,
    },
  },
  link: {
    color: colors.primary,
    textUnderlineOffset: "4px",
    textDecorationLine: {
      default: "none",
      [HOVER]: "underline",
    },
  },
});
export type ButtonVariant = keyof typeof buttonVariants;

export const buttonSizes = stylex.create({
  xs: {
    height: spacing[6],
    gap: spacing[1],
    borderRadius: {
      default: `min(${radii.md}, 10px)`,
      [stylex.when.ancestor('[data-slot="button-group"]')]: radii.lg,
    },
    paddingInline: spacing[2],
    fontSize: fontSizes.xs,
    lineHeight: leading.xs,
    paddingRight: {
      default: null,
      [stylex.when.descendant('[data-icon="inline-end"]')]: spacing[1.5],
    },
    paddingLeft: {
      default: null,
      [stylex.when.descendant('[data-icon="inline-start"]')]: spacing[1.5],
    },
  },
  sm: {
    height: spacing[7],
    gap: spacing[1],
    borderRadius: {
      default: `min(${radii.md}, 12px)`,
      [stylex.when.ancestor('[data-slot="button-group"]')]: radii.lg,
    },
    paddingInline: spacing[2.5],
    fontSize: "0.8rem",
    paddingRight: {
      default: null,
      [stylex.when.descendant('[data-icon="inline-end"]')]: spacing[1.5],
    },
    paddingLeft: {
      default: null,
      [stylex.when.descendant('[data-icon="inline-start"]')]: spacing[1.5],
    },
  },
  default: {
    height: spacing[8],
    gap: spacing[1.5],
    paddingInline: spacing[2.5],
    paddingRight: {
      default: null,
      [stylex.when.descendant('[data-icon="inline-end"]')]: spacing[2],
    },
    paddingLeft: {
      default: null,
      [stylex.when.descendant('[data-icon="inline-start"]')]: spacing[2],
    },
  },
  lg: {
    height: spacing[9],
    gap: spacing[1.5],
    paddingInline: spacing[2.5],
    paddingRight: {
      default: null,
      [stylex.when.descendant('[data-icon="inline-end"]')]: spacing[2],
    },
    paddingLeft: {
      default: null,
      [stylex.when.descendant('[data-icon="inline-start"]')]: spacing[2],
    },
  },
  iconXs: {
    height: spacing[6],
    width: spacing[6],
    borderRadius: {
      default: `min(${radii.md}, 10px)`,
      [stylex.when.ancestor('[data-slot="button-group"]')]: radii.lg,
    },
  },
  iconSm: {
    height: spacing[7],
    width: spacing[7],
    borderRadius: {
      default: `min(${radii.md}, 12px)`,
      [stylex.when.ancestor('[data-slot="button-group"]')]: radii.lg,
    },
  },
  icon: {
    height: spacing[8],
    width: spacing[8],
  },
  iconLg: {
    height: spacing[9],
    width: spacing[9],
  },
});
export type ButtonSize = keyof typeof buttonSizes;

export interface ButtonStyleProps extends StyleXComponentProps<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export interface LinkButtonStyleProps extends StyleXComponentProps<"a"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}
