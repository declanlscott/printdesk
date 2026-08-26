import * as stylex from "@stylexjs/stylex";

import { fieldGroupMarker } from "../markers.stylex";
import { spacing } from "../tokens.stylex";

import type { StyleXComponentProps } from "../types";

export const fieldGroupStyles = stylex.create({
  base: {
    gap: {
      ['[data-slot="checkbox-group"]']: spacing[3],
      default: spacing[5],
      [stylex.when.ancestor('[data-slot="field-group"]', fieldGroupMarker)]: spacing[4],
    },
    display: "flex",
    flexDirection: "column",
    width: "100%",
  },
});

export type FieldGroupStyleProps = StyleXComponentProps<"div">;
