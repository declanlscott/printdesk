import * as stylex from "@stylexjs/stylex";

import { fontSizes, leading } from "../tokens.stylex";

import type { StyleXComponentProps } from "../types";

export const cardTitleStyles = stylex.create({
  base: {
    fontSize: fontSizes.base,
    lineHeight: leading.snug,
    fontWeight: "500",
  },
});

export type CardTitleStyleProps = StyleXComponentProps<"div">;
