import * as stylex from "@stylexjs/stylex";

import { fieldGroupMarker } from "../markers.stylex";
import { spacing } from "../tokens.stylex";

import type { StyleXComponentProps } from "../types";

export const fieldGroupStyles = stylex.create({
  base: {
    display: "flex",
    width: "100%",
    flexDirection: "column",
    gap: {
      default: spacing[5],
      ['[data-slot="checkbox-group"]']: spacing[3],
      [stylex.when.ancestor('[data-slot="field-group"]', fieldGroupMarker)]: spacing[4],
    },
  },
});

export type FieldGroupStyleProps = StyleXComponentProps<"div">;
