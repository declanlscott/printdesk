import * as stylex from "@stylexjs/stylex";

import { cardActionMarker, cardDescriptionMarker } from "../markers.stylex";
import { radii, spacing } from "../tokens.stylex";

import type { StyleXComponentProps } from "../types";

export const cardHeaderStyles = stylex.create({
  base: {
    display: "grid",
    gridAutoRows: "min-content",
    alignItems: "start",
    gap: spacing[1],
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingInline: "var(--card-spacing)",
    gridTemplateColumns: {
      default: null,
      [stylex.when.descendant('[data-slot="card-action"]', cardActionMarker)]: "1fr auto",
    },
    gridTemplateRows: {
      default: null,
      [stylex.when.descendant('[data-slot="card-description"]', cardDescriptionMarker)]:
        "auto auto",
    },
  },
});

export type CardHeaderStyleProps = StyleXComponentProps<"div">;
