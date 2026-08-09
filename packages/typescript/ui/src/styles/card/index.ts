import * as stylex from "@stylexjs/stylex";

import { colors, fontSizes, radii, spacing } from "../tokens.stylex";
import { cardFooterMarker } from "./markers.stylex";

import type { StyleXComponentProps } from "../types";

export const cardStyles = stylex.create({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--card-spacing)",
    overflow: "hidden",
    borderRadius: radii.xl,
    paddingBlock: "var(--card-spacing)",
    backgroundColor: colors.card,
    fontSize: fontSizes.sm,
    color: colors.cardForeground,
    boxShadow: `0 0 0 1px color-mix(in oklab, ${colors.foreground} 10%, transparent)`,
    paddingBottom: {
      default: null,
      [stylex.when.descendant('[data-slot="card-footer"]', cardFooterMarker)]: spacing[0],
    },
  },
});

export const cardSizes = stylex.create({
  default: {
    "--card-spacing": spacing[4],
  },
  sm: {
    "--card-spacing": spacing[3],
  },
});

export type CardSize = keyof typeof cardSizes;

export interface CardStyleProps extends StyleXComponentProps<"div"> {
  size?: CardSize;
}
