import * as stylex from "@stylexjs/stylex";

import { fieldGroupMarker, radioGroupMarker } from "../markers.stylex";
import { spacing } from "../tokens.stylex";

import type { StyleXComponentProps } from "../types";

export const fieldSetStyles = stylex.create({
  base: {
    gap: {
      default: spacing[4],
      [stylex.when.descendant('[data-slot="checkbox-group"]', fieldGroupMarker)]: spacing[3],
      [stylex.when.descendant('[data-slot="radio-group"]', radioGroupMarker)]: spacing[3],
    },
    display: "flex",
    flexDirection: "column",
  },
});

export type FieldSetStyleProps = StyleXComponentProps<"fieldset">;
