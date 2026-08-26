import * as stylex from "@stylexjs/stylex";

import { colors, fontSizes, fontWeights, leading, spacing } from "../tokens.stylex";

import type { StyleXComponentProps } from "../types";

const LAST = ":last";
const SECOND_LAST = ":nth-last-child(2)";

export const fieldDescriptionStyles = stylex.create({
  base: {
    color: colors.mutedForeground,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.normal,
    lineHeight: leading.sm,
    textAlign: "left",
    marginTop: {
      [LAST]: spacing[0],
      [SECOND_LAST]: spacing[-1],
    },
  },
});

export type FieldDescriptionStyleProps = StyleXComponentProps<"p">;
