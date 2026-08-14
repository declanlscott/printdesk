import * as stylex from "@stylexjs/stylex";

import { checkboxMarker, fieldMarker } from "../markers.stylex";
import { colors, leading, radii, spacing } from "../tokens.stylex";

import type { StyleXComponentProps } from "../types";

export const fieldLabelStyles = stylex.create({
  base: {
    display: "flex",
    width: "fit-content",
    gap: spacing[2],
    lineHeight: leading.snug,
    [stylex.when.ancestor('[data-disabled="true"]', fieldMarker)]: {
      opacity: "50%",
    },
    [stylex.when.descendant('[data-selected="true"]', checkboxMarker)]: {
      borderColor: `light-dark(color-mix(in oklab, ${colors.primary} 30%, transparent), color-mix(in oklab, ${colors.primary} 20%, transparent))`,
      backgroundColor: `light-dark(color-mix(in oklab, ${colors.primary} 5%, transparent), color-mix(in oklab, ${colors.primary} 10%, transparent))`,
    },
    [stylex.when.descendant('[data-slot="field"]', fieldMarker)]: {
      borderRadius: radii.lg,
      borderWidth: spacing.px,
      width: "100%",
      flexDirection: "column",
    },
  },
});

export type FieldLabelStyleProps = StyleXComponentProps<"label">;
