import * as stylex from "@stylexjs/stylex";

import { cardActionMarker, cardDescriptionMarker } from "../markers.stylex";
import { radii, spacing } from "../tokens.stylex";

import type { StyleXComponentProps } from "../types";

export const cardHeaderStyles = stylex.create({
  base: {
    gap: spacing[1],
    paddingInline: "var(--card-spacing)",
    alignItems: "start",
    display: "grid",
    gridAutoRows: "min-content",
    gridTemplateColumns: {
      default: null,
      [stylex.when.descendant('[data-slot="card-action"]', cardActionMarker)]: "1fr auto",
    },
    gridTemplateRows: {
      default: null,
      [stylex.when.descendant('[data-slot="card-description"]', cardDescriptionMarker)]:
        "auto auto",
    },
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
});

export type CardHeaderStyleProps = StyleXComponentProps<"div">;
