import * as stylex from "@stylexjs/stylex";

import { colors, fontSizes, fontWeights, leading } from "../tokens.stylex";

import type { StyleXComponentProps } from "../types";

export const fieldErrorStyles = stylex.create({
  base: {
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
    fontWeight: fontWeights.normal,
    color: colors.destructive,
  },
});

export type FieldErrorStyleProps = StyleXComponentProps<"div">;
