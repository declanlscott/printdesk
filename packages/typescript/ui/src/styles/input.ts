import * as stylex from "@stylexjs/stylex";

import { colors, fontSizes, radii, spacing, timing } from "./tokens.stylex";

import type { StyleXComponentProps } from "./types";

const ARIA_INVALID = '[aria-invalid="true"]';
const DISABLED = ":disabled";
const FILE = "::file-selector-button";
const FOCUS_VISIBLE = ":focus-visible";

const PLACEHOLDER = "::placeholder";

export const inputStyles = stylex.create({
  base: {
    height: {
      default: spacing[8],
      [FILE]: spacing[6],
    },
    width: "100%",
    minWidth: spacing[0],
    borderRadius: radii.lg,
    borderWidth: {
      default: "1px",
      [FILE]: 0,
    },
    borderColor: {
      default: colors.input,
      [FOCUS_VISIBLE]: colors.ring,
      [ARIA_INVALID]: `light-dark(${colors.destructive}, color-mix(in oklab, ${colors.destructive} 50%, transparent))`,
    },
    backgroundColor: {
      default: `light-dark(transparent, color-mix(in oklab, ${colors.input} 30%, transparent))`,
      [DISABLED]: `light-dark(color-mix(in oklab, ${colors.input} 50%, transparent), color-mix(in oklab, ${colors.input} 80%, transparent))`,
    },
    paddingInline: spacing[2.5],
    paddingBlock: spacing[1],
    fontSize: {
      default: fontSizes.base,
      [FILE]: fontSizes.sm,
    },
    transitionProperty:
      "color, background-color, border-color, outline-color, text-decoration-color, stroke",
    transitionTimingFunction: timing.easeInOut,
    transitionDuration: timing[150],
    outlineStyle: "none",
    display: {
      default: null,
      [FILE]: "inline-flex",
    },
    fontWeight: {
      default: null,
      [FILE]: "500",
    },
    color: {
      default: null,
      [FILE]: colors.foreground,
      [PLACEHOLDER]: colors.mutedForeground,
    },
    boxShadow: {
      default: null,
      [FOCUS_VISIBLE]: `0 0 0 3px color-mix(in oklab, ${colors.ring} 50%, transparent)`,
      [ARIA_INVALID]: `0 0 0 3px color-mix(in oklab, ${colors.destructive} 20%, transparent)`,
    },
    pointerEvents: {
      default: null,
      [FOCUS_VISIBLE]: "none",
    },
    cursor: {
      default: null,
      [DISABLED]: "not-allowed",
    },
    opacity: {
      default: null,
      [DISABLED]: 0.5,
    },
  },
});

export type InputStyleProps = StyleXComponentProps<"input">;
