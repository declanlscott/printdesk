import * as stylex from "@stylexjs/stylex";

import { fieldMarker } from "./markers.stylex";
import { colors, spacing, timing } from "./tokens.stylex";

import type { StyleXComponentProps } from "./types";

const AFTER = "::after";
const DATA_FOCUS_VISIBLE = '[data-focus-visible="true"]';
const DATA_DISABLED = '[data-disabled="true"]';
const DATA_INVALID = '[data-invalid="true"]';
const DATA_SELECTED = '[data-selected="true"]';
const DISABLED = ":disabled";

export const checkboxStyles = stylex.create({
  base: {
    position: "relative",
    display: "flex",
    width: spacing[4],
    height: spacing[4],
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "4px",
    borderWidth: spacing.px,
    borderColor: colors.input,
    transitionProperty:
      "color, background-color, border-color, outline-color, text-decoration-color, stroke",
    transitionTimingFunction: timing.easeInOut,
    transitionDuration: timing[150],
    outline: "none",
    [stylex.when.ancestor(DISABLED, fieldMarker)]: {
      opacity: "50%",
    },
    [AFTER]: {
      content: "",
      position: "absolute",
      insetInline: spacing[-3],
      insetBlock: spacing[-2],
    },
    [DATA_DISABLED]: {
      cursor: "not-allowed",
      opacity: "50%",
    },
    [DATA_FOCUS_VISIBLE]: {
      borderColor: colors.ring,
      boxShadow: `0 0 0 3px color-mix(in oklab, ${colors.ring} 50%, transparent)`,
    },
    [DATA_INVALID]: {
      borderColor: `light-dark(${colors.destructive}, color-mix(in oklab, ${colors.destructive} 50%, transparent))`,
      boxShadow: `0 0 0 3px light-dark(color-mix(in oklab, ${colors.destructive} 20%, transparent), color-mix(in oklab, ${colors.destructive} 40%, transparent))`,
      [DATA_SELECTED]: {
        borderColor: colors.primary,
      },
    },
    [DATA_SELECTED]: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
      color: colors.primaryForeground,
    },
  },
});

export type CheckboxStyleProps = StyleXComponentProps<"label">;
