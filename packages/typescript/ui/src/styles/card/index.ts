import * as stylex from "@stylexjs/stylex";

import { cardFooterMarker } from "../markers.stylex";
import { colors, fontSizes, radii, spacing } from "../tokens.stylex";

import type { StyleXComponentProps } from "../types";

export const cardStyles = stylex.create({
  base: {
    borderRadius: radii.xl,
    gap: "var(--card-spacing)",
    overflow: "hidden",
    paddingBlock: "var(--card-spacing)",
    backgroundColor: colors.card,
    boxShadow: `0 0 0 1px color-mix(in oklab, ${colors.foreground} 10%, transparent)`,
    color: colors.cardForeground,
    display: "flex",
    flexDirection: "column",
    fontSize: fontSizes.sm,
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
