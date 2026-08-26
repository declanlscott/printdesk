import * as stylex from "@stylexjs/stylex";

import { fieldGroupMarker } from "../markers.stylex";
import { fontSizes, leading, spacing } from "../tokens.stylex";

import type { StyleXComponentProps } from "../types";

export const fieldSeparatorStyles = stylex.create({
  base: {
    marginBlock: spacing[-2],
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
    position: "relative",
    height: spacing[5],
    marginBottom: {
      [stylex.when.ancestor('[data-variant="outline"]', fieldGroupMarker)]: spacing[-2],
    },
  },
});

export type FieldSeparatorStyleProps = StyleXComponentProps<"div">;
