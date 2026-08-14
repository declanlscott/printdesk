import * as stylex from "@stylexjs/stylex";

import { colors, fontSizes, fontWeights, leading, spacing } from "../tokens.stylex";

import type { StyleXComponentProps } from "../types";

const LAST = ":last";
const SECOND_LAST = ":nth-last-child(2)";

export const fieldDescriptionStyles = stylex.create({
  base: {
    textAlign: "left",
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
    fontWeight: fontWeights.normal,
    color: colors.mutedForeground,
    marginTop: {
      [LAST]: spacing[0],
      [SECOND_LAST]: spacing[-1],
    },
  },
});

export type FieldDescriptionStyleProps = StyleXComponentProps<"p">;
