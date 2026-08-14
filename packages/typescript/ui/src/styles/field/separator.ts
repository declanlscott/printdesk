import * as stylex from "@stylexjs/stylex";

import { fieldGroupMarker } from "../markers.stylex";
import { fontSizes, leading, spacing } from "../tokens.stylex";

import type { StyleXComponentProps } from "../types";

export const fieldSeparatorStyles = stylex.create({
  base: {
    position: "relative",
    marginBlock: spacing[-2],
    height: spacing[5],
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
    [stylex.when.ancestor('[data-variant="outline"]', fieldGroupMarker)]: {
      marginBottom: spacing[-2],
    },
  },
});

export type FieldSeparatorStyleProps = StyleXComponentProps<"div">;
