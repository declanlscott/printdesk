import * as stylex from "@stylexjs/stylex";

import { colors, fontSizes, fontWeights, radii, spacing, timing } from "./tokens.stylex";

import type { StyleXComponentProps } from "./types";

const ANCHOR_HOVER = ":is(a):hover";
const ARIA_INVALID = '[aria-invalid="true"]';
const FOCUS_VISIBLE = ":focus-visible";
const HOVER = ":hover";

export const badgeStyles = stylex.create({
  base: {
    borderColor: {
      [ARIA_INVALID]: colors.destructive,
      [FOCUS_VISIBLE]: colors.ring,
      default: "transparent",
    },
    borderRadius: radii["4xl"],
    borderStyle: "solid",
    borderWidth: "1px",
    gap: spacing[1],
    overflow: "hidden",
    paddingBlock: spacing[0.5],
    paddingInline: spacing[2],
    alignItems: "center",
    boxShadow: {
      [ARIA_INVALID]: `0 0 0 3px light-dark(color-mix(in oklab, ${colors.destructive} 20%, transparent), color-mix(in oklab, ${colors.destructive} 40%, transparent))`,
      [FOCUS_VISIBLE]: `0 0 0 3px color-mix(in oklab, ${colors.ring} 50%, transparent)`,
      default: null,
    },
    display: "inline-flex",
    flexShrink: 0,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    justifyContent: "center",
    transitionDuration: timing[150],
    transitionProperty: "all",
    transitionTimingFunction: timing.easeInOut,
    whiteSpace: "nowrap",
    height: spacing[5],
    paddingLeft: {
      default: null,
      [stylex.when.descendant('[data-icon="inline-start"]')]: spacing[1.5],
    },
    paddingRight: {
      default: null,
      [stylex.when.descendant('[data-icon="inline-end"]')]: spacing[1.5],
    },
    width: "fit-content",
  },
});

export const badgeVariants = stylex.create({
  default: {
    backgroundColor: {
      [ANCHOR_HOVER]: `color-mix(in oklab, ${colors.primary} 80%, transparent)`,
      default: colors.primary,
    },
    color: colors.primaryForeground,
  },
  secondary: {
    backgroundColor: {
      [ANCHOR_HOVER]: `color-mix(in oklab, ${colors.secondary} 80%, transparent)`,
      default: colors.secondary,
    },
    color: colors.secondaryForeground,
  },
  destructive: {
    borderColor: {
      [FOCUS_VISIBLE]: `color-mix(in oklab, ${colors.destructive} 40%, transparent)`,
      default: "transparent",
    },
    backgroundColor: {
      [ANCHOR_HOVER]: `color-mix(in oklab, ${colors.destructive} 20%, transparent)`,
      default: `light-dark(color-mix(in oklab, ${colors.destructive} 10%, transparent), color-mix(in oklab, ${colors.destructive} 20%, transparent))`,
    },
    boxShadow: {
      [FOCUS_VISIBLE]: `0 0 0 3px light-dark(color-mix(in oklab, ${colors.destructive} 20%, transparent), color-mix(in oklab, ${colors.destructive} 40%, transparent))`,
      default: null,
    },
    color: colors.destructive,
  },
  outline: {
    borderColor: colors.border,
    backgroundColor: {
      [ANCHOR_HOVER]: colors.muted,
      default: null,
    },
    color: {
      [ANCHOR_HOVER]: colors.mutedForeground,
      default: colors.foreground,
    },
  },
  ghost: {
    backgroundColor: {
      [HOVER]: `light-dark(${colors.muted}, color-mix(in oklab, ${colors.muted} 50%, transparent))`,
      default: null,
    },
    color: {
      [HOVER]: colors.mutedForeground,
      default: null,
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
