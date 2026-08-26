import * as stylex from "@stylexjs/stylex";

import { fieldMarker } from "../markers.stylex";
import { fontSizes, fontWeights, leading, spacing } from "../tokens.stylex";

import type { StyleXComponentProps } from "../types";

export const fieldTitleStyles = stylex.create({
  base: {
    gap: spacing[2],
    alignItems: "center",
    display: "flex",
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    lineHeight: leading.sm,
    opacity: {
      [stylex.when.ancestor('[data-disabled="true"]', fieldMarker)]: "50%",
    },
    width: "fit-content",
  },
});

export type FieldTitleStyleProps = StyleXComponentProps<"div">;
