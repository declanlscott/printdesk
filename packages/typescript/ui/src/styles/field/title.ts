import * as stylex from "@stylexjs/stylex";

import { fieldMarker } from "../markers.stylex";
import { fontSizes, fontWeights, leading, spacing } from "../tokens.stylex";

import type { StyleXComponentProps } from "../types";

export const fieldTitleStyles = stylex.create({
  base: {
    display: "flex",
    width: "fit-content",
    alignItems: "center",
    gap: spacing[2],
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
    fontWeight: fontWeights.medium,
    [stylex.when.ancestor('[data-disabled="true"]', fieldMarker)]: {
      opacity: "50%",
    },
  },
});

export type FieldTitleStyleProps = StyleXComponentProps<"div">;
