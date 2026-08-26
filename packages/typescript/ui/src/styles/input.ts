import * as stylex from "@stylexjs/stylex";

import { colors, fontSizes, fontWeights, radii, spacing, timing } from "./tokens.stylex";

import type { StyleXComponentProps } from "./types";

const ARIA_INVALID = '[aria-invalid="true"]';
const DISABLED = ":disabled";
const FILE = "::file-selector-button";
const FOCUS_VISIBLE = ":focus-visible";

const PLACEHOLDER = "::placeholder";

export const inputStyles = stylex.create({
  base: {
    borderColor: {
      [ARIA_INVALID]: `light-dark(${colors.destructive}, color-mix(in oklab, ${colors.destructive} 50%, transparent))`,
      [FOCUS_VISIBLE]: colors.ring,
      default: colors.input,
    },
    borderRadius: radii.lg,
    borderWidth: {
      [FILE]: 0,
      default: "1px",
    },
    paddingBlock: spacing[1],
    paddingInline: spacing[2.5],
    backgroundColor: {
      [DISABLED]: `light-dark(color-mix(in oklab, ${colors.input} 50%, transparent), color-mix(in oklab, ${colors.input} 80%, transparent))`,
      default: `light-dark(transparent, color-mix(in oklab, ${colors.input} 30%, transparent))`,
    },
    boxShadow: {
      [ARIA_INVALID]: `0 0 0 3px color-mix(in oklab, ${colors.destructive} 20%, transparent)`,
      [FOCUS_VISIBLE]: `0 0 0 3px color-mix(in oklab, ${colors.ring} 50%, transparent)`,
      default: null,
    },
    color: {
      [FILE]: colors.foreground,
      [PLACEHOLDER]: colors.mutedForeground,
      default: null,
    },
    cursor: {
      [DISABLED]: "not-allowed",
      default: null,
    },
    display: {
      [FILE]: "inline-flex",
      default: null,
    },
    fontSize: {
      [FILE]: fontSizes.sm,
      default: fontSizes.base,
    },
    fontWeight: {
      [FILE]: fontWeights.medium,
      default: null,
    },
    opacity: {
      [DISABLED]: 0.5,
      default: null,
    },
    outlineStyle: "none",
    pointerEvents: {
      [FOCUS_VISIBLE]: "none",
      default: null,
    },
    transitionDuration: timing[150],
    transitionProperty:
      "color, background-color, border-color, outline-color, text-decoration-color, stroke",
    transitionTimingFunction: timing.easeInOut,
    height: {
      [FILE]: spacing[6],
      default: spacing[8],
    },
    minWidth: spacing[0],
    width: "100%",
  },
});

export type InputStyleProps = StyleXComponentProps<"input">;
