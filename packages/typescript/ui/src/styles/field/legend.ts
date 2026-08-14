import * as stylex from "@stylexjs/stylex";

import { fontSizes, fontWeights, leading, spacing } from "../tokens.stylex";

import type { StyleXComponentProps } from "../types";

export const fieldLegendStyles = stylex.create({
  base: {
    marginBottom: spacing[1.5],
    fontWeight: fontWeights.medium,
  },
});

export const fieldLegendVariants = stylex.create({
  label: {
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
  },
  legend: {
    fontSize: fontSizes.base,
    lineHeight: leading.base,
  },
});
export type FieldLegend = keyof typeof fieldLegendVariants;

export interface FieldLegendStyleProps extends StyleXComponentProps<"legend"> {
  variant?: FieldLegend;
}
