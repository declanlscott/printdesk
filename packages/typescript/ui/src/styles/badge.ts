import * as stylex from "@stylexjs/stylex";

import { colors, fontSizes, radii, spacing, timing } from "./tokens.stylex";

import type { StyleXComponentProps } from "./types";

const ANCHOR_HOVER = ":is(a):hover";
const ARIA_INVALID = '[aria-invalid="true"]';
const FOCUS_VISIBLE = ":focus-visible";
const HOVER = ":hover";

export const badgeStyles = stylex.create({
  base: {
    display: "inline-flex",
    height: spacing[5],
    width: "fit-content",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[1],
    overflow: "hidden",
    borderRadius: radii["4xl"],
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: {
      default: "transparent",
      [FOCUS_VISIBLE]: colors.ring,
      [ARIA_INVALID]: colors.destructive,
    },
    paddingBlock: spacing[0.5],
    paddingInline: spacing[2],
    paddingRight: {
      default: null,
      [stylex.when.descendant('[data-icon="inline-end"]')]: spacing[1.5],
    },
    paddingLeft: {
      default: null,
      [stylex.when.descendant('[data-icon="inline-start"]')]: spacing[1.5],
    },
    fontSize: fontSizes.xs,
    fontWeight: "500",
    whiteSpace: "nowrap",
    transitionProperty: "all",
    transitionTimingFunction: timing.easeInOut,
    transitionDuration: timing[150],
    boxShadow: {
      default: null,
      [FOCUS_VISIBLE]: `0 0 0 3px color-mix(in oklab, ${colors.ring} 50%, transparent)`,
      [ARIA_INVALID]: `0 0 0 3px light-dark(color-mix(in oklab, ${colors.destructive} 20%, transparent), color-mix(in oklab, ${colors.destructive} 40%, transparent))`,
    },
  },
});

export const badgeVariants = stylex.create({
  default: {
    backgroundColor: {
      default: colors.primary,
      [ANCHOR_HOVER]: `color-mix(in oklab, ${colors.primary} 80%, transparent)`,
    },
    color: colors.primaryForeground,
  },
  secondary: {
    backgroundColor: {
      default: colors.secondary,
      [ANCHOR_HOVER]: `color-mix(in oklab, ${colors.secondary} 80%, transparent)`,
    },
    color: colors.secondaryForeground,
  },
  destructive: {
    borderColor: {
      default: "transparent",
      [FOCUS_VISIBLE]: `color-mix(in oklab, ${colors.destructive} 40%, transparent)`,
    },
    backgroundColor: {
      default: `light-dark(color-mix(in oklab, ${colors.destructive} 10%, transparent), color-mix(in oklab, ${colors.destructive} 20%, transparent))`,
      [ANCHOR_HOVER]: `color-mix(in oklab, ${colors.destructive} 20%, transparent)`,
    },
    color: colors.destructive,
    boxShadow: {
      default: null,
      [FOCUS_VISIBLE]: `0 0 0 3px light-dark(color-mix(in oklab, ${colors.destructive} 20%, transparent), color-mix(in oklab, ${colors.destructive} 40%, transparent))`,
    },
  },
  outline: {
    borderColor: colors.border,
    backgroundColor: {
      default: null,
      [ANCHOR_HOVER]: colors.muted,
    },
    color: {
      default: colors.foreground,
      [ANCHOR_HOVER]: colors.mutedForeground,
    },
  },
  ghost: {
    backgroundColor: {
      default: null,
      [HOVER]: `light-dark(${colors.muted}, color-mix(in oklab, ${colors.muted} 50%, transparent))`,
    },
    color: {
      default: null,
      [HOVER]: colors.mutedForeground,
    },
  },
});
export type BadgeVariant = keyof typeof badgeVariants;

export interface BadgeStyleProps extends StyleXComponentProps<"span"> {
  variant?: BadgeVariant;
}

export interface BadgeLinkStyleProps extends StyleXComponentProps<"a"> {
  variant?: BadgeVariant;
}
