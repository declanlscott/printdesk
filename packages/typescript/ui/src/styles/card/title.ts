import * as stylex from "@stylexjs/stylex";

import { fontSizes, fontWeights, leading } from "../tokens.stylex";

import type { StyleXComponentProps } from "../types";

export const cardTitleStyles = stylex.create({
  base: {
    fontSize: fontSizes.base,
    lineHeight: leading.snug,
    fontWeight: fontWeights.medium,
  },
});

export type CardTitleStyleProps = StyleXComponentProps<"div">;
