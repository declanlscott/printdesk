import * as stylex from "@stylexjs/stylex";

import { colors, fontSizes, leading } from "../tokens.stylex";

import type { StyleXComponentProps } from "../types";

export const cardDescriptionStyles = stylex.create({
  base: {
    color: colors.mutedForeground,
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
  },
});

export type CardDescriptionStyleProps = StyleXComponentProps<"div">;
