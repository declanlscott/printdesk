import * as stylex from "@stylexjs/stylex";

import { colors, fontSizes, fontWeights, leading, radii, spacing, timing } from "./tokens.stylex";

import type { StyleXComponentProps } from "./types";

const ARIA_EXPANDED = '[aria-expanded="true"]';
const ARIA_INVALID = '[aria-invalid="true"]';
const DISABLED = ":disabled";
const FOCUS_VISIBLE = ":focus-visible";
const HOVER = ":hover";

export const buttonStyles = stylex.create({
  base: {
    borderColor: {
      [ARIA_EXPANDED]: colors.destructive,
      [FOCUS_VISIBLE]: colors.ring,
      default: "transparent",
    },
    borderRadius: radii.lg,
    borderStyle: "solid",
    borderWidth: "1px",
    outline: "none",
    alignItems: "center",
    backgroundClip: "padding-box",
    boxShadow: {
      [ARIA_INVALID]: `0 0 0 3px light-dark(color-mix(in oklab, ${colors.destructive} 20%, transparent), color-mix(in oklab, ${colors.destructive} 40%, transparent))`,
      [FOCUS_VISIBLE]: `0 0 0 3px color-mix(in oklab, ${colors.ring} 50%, transparent)`,
      default: null,
    },
    cursor: {
      [DISABLED]: "not-allowed",
      default: "pointer",
    },
    display: "inline-flex",
    flexShrink: 0,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    justifyItems: "center",
    lineHeight: leading.sm,
    opacity: {
      [DISABLED]: 0.5,
      default: null,
    },
    pointerEvents: {
      [DISABLED]: "none",
      default: null,
    },
    transitionDuration: timing[150],
    transitionProperty: "all",
    transitionTimingFunction: timing.easeInOut,
    translate: {
      default: null,
      ':active:not([aria-haspopup="true"])': "0 1px",
    },
    userSelect: "none",
    whiteSpace: "nowrap",
  },
});

export const buttonVariants = stylex.create({
  default: {
    backgroundColor: {
      [HOVER]: `color-mix(in oklab, ${colors.primary} 80%, transparent)`,
      default: colors.primary,
    },
    color: colors.primaryForeground,
  },
  outline: {
    borderColor: {
      [ARIA_EXPANDED]: colors.destructive,
      [FOCUS_VISIBLE]: colors.ring,
      default: `light-dark(${colors.border}, ${colors.input})`,
    },
    backgroundColor: {
      [ARIA_EXPANDED]: colors.muted,
      [HOVER]: `light-dark(${colors.muted}, color-mix(in oklab, ${colors.input} 50%, transparent))`,
      default: `light-dark(${colors.background}, color-mix(in oklab, ${colors.input} 30%, transparent))`,
    },
    color: {
      [ARIA_EXPANDED]: colors.foreground,
      [HOVER]: colors.foreground,
      default: null,
    },
  },
  secondary: {
    backgroundColor: {
      [ARIA_EXPANDED]: colors.secondary,
      [HOVER]: `color-mix(in oklch, ${colors.secondary}, ${colors.foreground} 5%)`,
      default: colors.secondary,
    },
    color: {
      [ARIA_EXPANDED]: colors.secondaryForeground,
      default: colors.secondaryForeground,
    },
  },
  ghost: {
    backgroundColor: {
      [HOVER]: `light-dark(${colors.muted}, color-mix(in oklab, ${colors.muted} 50%, transparent))`,
      default: null,
    },
    color: {
      [ARIA_EXPANDED]: colors.foreground,
      [HOVER]: colors.foreground,
      default: null,
    },
  },
  destructive: {
    borderColor: {
      [FOCUS_VISIBLE]: `color-mix(in oklab, ${colors.destructive} 40%, transparent)`,
      default: "transparent",
    },
    backgroundColor: {
      [HOVER]: `light-dark(color-mix(in oklab, ${colors.destructive} 20%, transparent), color-mix(in oklab, ${colors.destructive} 30%, transparent))`,
      default: `light-dark(color-mix(in oklab, ${colors.destructive} 10%, transparent), color-mix(in oklab, ${colors.destructive} 20%, transparent))`,
    },
    boxShadow: {
      [FOCUS_VISIBLE]: `0 0 0 3px light-dark(color-mix(in oklab, ${colors.destructive} 20%, transparent), color-mix(in oklab, ${colors.destructive} 40%, transparent))`,
      default: null,
    },
    color: colors.destructive,
  },
  link: {
    color: colors.primary,
    textDecorationLine: {
      [HOVER]: "underline",
      default: "none",
    },
    textUnderlineOffset: "4px",
  },
});
export type ButtonVariant = keyof typeof buttonVariants;

export const buttonSizes = stylex.create({
  xs: {
    borderRadius: {
      default: `min(${radii.md}, 10px)`,
      [stylex.when.ancestor('[data-slot="button-group"]')]: radii.lg,
    },
    gap: spacing[1],
    paddingInline: spacing[2],
    fontSize: fontSizes.xs,
    lineHeight: leading.xs,
    height: spacing[6],
    paddingLeft: {
      default: null,
      [stylex.when.descendant('[data-icon="inline-start"]')]: spacing[1.5],
    },
    paddingRight: {
      default: null,
      [stylex.when.descendant('[data-icon="inline-end"]')]: spacing[1.5],
    },
  },
  sm: {
    borderRadius: {
      default: `min(${radii.md}, 12px)`,
      [stylex.when.ancestor('[data-slot="button-group"]')]: radii.lg,
    },
    gap: spacing[1],
    paddingInline: spacing[2.5],
    fontSize: "0.8rem",
    height: spacing[7],
    paddingLeft: {
      default: null,
      [stylex.when.descendant('[data-icon="inline-start"]')]: spacing[1.5],
    },
    paddingRight: {
      default: null,
      [stylex.when.descendant('[data-icon="inline-end"]')]: spacing[1.5],
    },
  },
  default: {
    gap: spacing[1.5],
    paddingInline: spacing[2.5],
    height: spacing[8],
    paddingLeft: {
      default: null,
      [stylex.when.descendant('[data-icon="inline-start"]')]: spacing[2],
    },
    paddingRight: {
      default: null,
      [stylex.when.descendant('[data-icon="inline-end"]')]: spacing[2],
    },
  },
  lg: {
    gap: spacing[1.5],
    paddingInline: spacing[2.5],
    height: spacing[9],
    paddingLeft: {
      default: null,
      [stylex.when.descendant('[data-icon="inline-start"]')]: spacing[2],
    },
    paddingRight: {
      default: null,
      [stylex.when.descendant('[data-icon="inline-end"]')]: spacing[2],
    },
  },
  iconXs: {
    borderRadius: {
      default: `min(${radii.md}, 10px)`,
      [stylex.when.ancestor('[data-slot="button-group"]')]: radii.lg,
    },
    height: spacing[6],
    width: spacing[6],
  },
  iconSm: {
    borderRadius: {
      default: `min(${radii.md}, 12px)`,
      [stylex.when.ancestor('[data-slot="button-group"]')]: radii.lg,
    },
    height: spacing[7],
    width: spacing[7],
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
