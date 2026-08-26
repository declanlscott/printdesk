import * as stylex from "@stylexjs/stylex";

import { switchMarker } from "./markers.stylex";
import { colors, modes, radii, spacing, timing } from "./tokens.stylex";

import type { StyleXComponentProps } from "./types";

const AFTER = "::after";
const DISABLED = '[data-disabled="true"]';
const FOCUS_VISIBLE = '[data-focus-visible="true"]';
const SELECTED = '[data-selected="true"]';

export const switchStyles = stylex.create({
  base: {
    [AFTER]: {
      insetBlock: spacing[-2],
      insetInline: spacing[-3],
      content: "",
      position: "absolute",
    },
    borderColor: {
      [FOCUS_VISIBLE]: colors.ring,
      default: "transparent",
    },
    borderRadius: radii.full,
    borderWidth: spacing.px,
    outline: "none",
    alignItems: "center",
    backgroundColor: {
      [SELECTED]: colors.primary,
      default: `light-dark(${colors.input}, color-mix(in oklab, ${colors.input} 80%, transparent))`,
    },
    boxShadow: {
      [FOCUS_VISIBLE]: `0 0 0 3px color-mix(in oklab, ${colors.ring} 50%, transparent)`,
    },
    cursor: {
      [DISABLED]: "not-allowed",
      default: "pointer",
    },
    display: "inline-flex",
    flexShrink: "0",
    opacity: {
      [DISABLED]: "50%",
    },
    position: "relative",
    transitionDuration: timing[150],
    transitionProperty: "all",
    transitionTimingFunction: timing.easeInOut,
  },
  thumb: {
    borderRadius: radii.full,
    backgroundColor: {
      [SELECTED]: {
        [modes.dark]: colors.primaryForeground,
      },
      default: `light-dark(${colors.background}, ${colors.foreground})`,
    },
    display: "block",
    pointerEvents: "none",
    transitionDuration: timing[150],
    transitionProperty: "transform, translate, scale, rotate",
    transitionTimingFunction: timing.easeInOut,
    translate: {
      [SELECTED]: `calc(100% - 2px) ${spacing[0]}`,
      default: `${spacing[0]} ${spacing[0]}`,
    },
    height: {
      [stylex.when.ancestor('[data-size="default"]', switchMarker)]: spacing[4],
      [stylex.when.ancestor('[data-size="sm"]', switchMarker)]: spacing[3],
    },
    width: {
      [stylex.when.ancestor('[data-size="default"]', switchMarker)]: spacing[4],
      [stylex.when.ancestor('[data-size="sm"]', switchMarker)]: spacing[3],
    },
  },
});

export const switchSizes = stylex.create({
  sm: {
    height: "14px",
    width: "24px",
  },
  default: {
    height: "18.4px",
    width: "32px",
  },
});
export type SwitchSize = keyof typeof switchSizes;

export interface SwitchStyleProps extends StyleXComponentProps<"label"> {
  size?: SwitchSize;
}
