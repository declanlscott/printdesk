import * as stylex from "@stylexjs/stylex";

import { colors, fontSizes, fontWeights, leading } from "../tokens.stylex";

import type { StyleXComponentProps } from "../types";

export const fieldErrorStyles = stylex.create({
  base: {
    color: colors.destructive,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.normal,
    lineHeight: leading.sm,
  },
});

export type FieldErrorStyleProps = StyleXComponentProps<"div">;
