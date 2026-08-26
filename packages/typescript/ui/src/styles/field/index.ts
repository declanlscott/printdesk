import * as stylex from "@stylexjs/stylex";

import { colors, spacing } from "../tokens.stylex";

import type { StyleXComponentProps } from "../types";

export const fieldStyles = stylex.create({
  base: {
    gap: spacing[2],
    color: {
      '[data-invalid="true"]': colors.destructive,
    },
    display: "flex",
    width: "100%",
  },
});

export const fieldOrientations = stylex.create({
  vertical: {
    flexDirection: "column",
  },
  horizontal: {
    alignItems: "start",
    flexDirection: "row",
  },
  responsive: {
    flexDirection: "column",
  },
});
export type FieldOrientation = keyof typeof fieldOrientations;

export interface FieldStyleProps extends StyleXComponentProps<"div"> {
  orientation?: FieldOrientation;
}
