import * as stylex from "@stylexjs/stylex";

import { fieldLegendStyles, fieldLegendVariants } from "../../styles/field/legend";

import type { FieldLegendStyleProps } from "../../styles/field/legend";

export type FieldLegendProps = FieldLegendStyleProps;

export function FieldLegend({ variant = "legend", sx, ...props }: FieldLegendProps) {
  return (
    <legend
      {...stylex.props(fieldLegendStyles.base, fieldLegendVariants[variant], sx)}
      data-slot="field-legend"
      data-variant={variant}
      {...props}
    />
  );
}
