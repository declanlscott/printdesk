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
    [AFTER]: {
      insetBlock: spacing[-2],
      insetInline: spacing[-3],
      content: "",
      position: "absolute",
    },
    borderColor: {
      [DATA_FOCUS_VISIBLE]: colors.ring,
      [DATA_INVALID]: {
        [DATA_SELECTED]: colors.primary,
        default: `light-dark(${colors.destructive}, color-mix(in oklab, ${colors.destructive} 50%, transparent))`,
      },
      [DATA_SELECTED]: colors.primary,
      default: colors.input,
    },
    borderRadius: "4px",
    borderWidth: spacing.px,
    outline: "none",
    alignItems: "center",
    backgroundColor: {
      [DATA_SELECTED]: colors.primary,
    },
    boxShadow: {
      [DATA_FOCUS_VISIBLE]: `0 0 0 3px color-mix(in oklab, ${colors.ring} 50%, transparent)`,
      [DATA_INVALID]: `0 0 0 3px light-dark(color-mix(in oklab, ${colors.destructive} 20%, transparent), color-mix(in oklab, ${colors.destructive} 40%, transparent))`,
    },
    color: {
      [DATA_SELECTED]: colors.primaryForeground,
    },
    cursor: {
      [DISABLED]: "not-allowed",
    },
    display: "flex",
    flexShrink: 0,
    justifyContent: "center",
    opacity: {
      [DATA_DISABLED]: "50%",
      [stylex.when.ancestor(DISABLED, fieldMarker)]: "50%",
    },
    position: "relative",
    transitionDuration: timing[150],
    transitionProperty:
      "color, background-color, border-color, outline-color, text-decoration-color, stroke",
    transitionTimingFunction: timing.easeInOut,
    height: spacing[4],
    width: spacing[4],
  },
});

export type CheckboxStyleProps = StyleXComponentProps<"label">;
