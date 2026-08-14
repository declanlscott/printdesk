import * as stylex from "@stylexjs/stylex";

import { colors, spacing } from "../tokens.stylex";

import type { StyleXComponentProps } from "../types";

export const fieldStyles = stylex.create({
  base: {
    display: "flex",
    width: "100%",
    gap: spacing[2],
    ['[data-invalid="true"]']: {
      color: colors.destructive,
    },
  },
});

export const fieldOrientations = stylex.create({
  vertical: {
    flexDirection: "column",
  },
  horizontal: {
    flexDirection: "row",
    alignItems: "start",
  },
  responsive: {
    flexDirection: "column",
  },
});
export type FieldOrientation = keyof typeof fieldOrientations;

export interface FieldStyleProps extends StyleXComponentProps<"div"> {
  orientation?: FieldOrientation;
}
