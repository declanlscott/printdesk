import * as stylex from "@stylexjs/stylex";

import { checkboxMarker, fieldMarker } from "../markers.stylex";
import { colors, leading, radii, spacing } from "../tokens.stylex";

import type { StyleXComponentProps } from "../types";

export const fieldLabelStyles = stylex.create({
  base: {
    borderColor: {
      [stylex.when.descendant('[data-selected="true"]', checkboxMarker)]:
        `light-dark(color-mix(in oklab, ${colors.primary} 30%, transparent), color-mix(in oklab, ${colors.primary} 20%, transparent))`,
    },
    borderRadius: {
      [stylex.when.descendant('[data-slot="field"]', fieldMarker)]: radii.lg,
    },
    borderWidth: {
      [stylex.when.descendant('[data-slot="field"]', fieldMarker)]: spacing.px,
    },
    gap: spacing[2],
    backgroundColor: {
      [stylex.when.descendant('[data-selected="true"]', checkboxMarker)]:
        `light-dark(color-mix(in oklab, ${colors.primary} 5%, transparent), color-mix(in oklab, ${colors.primary} 10%, transparent))`,
    },
    display: "flex",
    flexDirection: {
      [stylex.when.descendant('[data-slot="field"]', fieldMarker)]: "column",
    },
    lineHeight: leading.snug,
    opacity: {
      [stylex.when.ancestor('[data-disabled="true"]', fieldMarker)]: "50%",
    },
    width: {
      default: "fit-content",
      [stylex.when.descendant('[data-slot="field"]', fieldMarker)]: "100%",
    },
  },
});

export type FieldLabelStyleProps = StyleXComponentProps<"label">;
