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
    position: "relative",
    display: "inline-flex",
    flexShrink: "0",
    alignItems: "center",
    borderRadius: radii.full,
    borderWidth: spacing.px,
    borderColor: "transparent",
    transitionProperty: "all",
    transitionTimingFunction: timing.easeInOut,
    transitionDuration: timing[150],
    outline: "none",
    backgroundColor: {
      default: `light-dark(${colors.input}, color-mix(in oklab, ${colors.input} 80%, transparent))`,
      [SELECTED]: colors.primary,
    },
    cursor: {
      default: "pointer",
      [DISABLED]: "not-allowed",
    },
    [AFTER]: {
      content: "",
      position: "absolute",
      insetInline: spacing[-3],
      insetBlock: spacing[-2],
    },
    [FOCUS_VISIBLE]: {
      borderColor: colors.ring,
      boxShadow: `0 0 0 3px color-mix(in oklab, ${colors.ring} 50%, transparent)`,
    },
    [DISABLED]: {
      opacity: "50%",
    },
  },
  thumb: {
    pointerEvents: "none",
    display: "block",
    borderRadius: radii.full,
    backgroundColor: {
      default: `light-dark(${colors.background}, ${colors.foreground})`,
      [SELECTED]: {
        [modes.dark]: colors.primaryForeground,
      },
    },
    transitionProperty: "transform, translate, scale, rotate",
    transitionTimingFunction: timing.easeInOut,
    transitionDuration: timing[150],
    translate: {
      default: `${spacing[0]} ${spacing[0]}`,
      [SELECTED]: `calc(100% - 2px) ${spacing[0]}`,
    },
    [stylex.when.ancestor('[data-size="default"]', switchMarker)]: {
      height: spacing[4],
      width: spacing[4],
    },
    [stylex.when.ancestor('[data-size="sm"]', switchMarker)]: {
      height: spacing[3],
      width: spacing[3],
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
