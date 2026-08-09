import * as stylex from "@stylexjs/stylex";

import { colors, fontSizes, leading } from "../tokens.stylex";

import type { StyleXComponentProps } from "../types";

export const cardDescriptionStyles = stylex.create({
  base: {
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
    color: colors.mutedForeground,
  },
});

export type CardDescriptionStyleProps = StyleXComponentProps<"div">;
