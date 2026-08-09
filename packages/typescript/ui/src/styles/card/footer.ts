import * as stylex from "@stylexjs/stylex";

import { colors, radii } from "../tokens.stylex";

import type { StyleXComponentProps } from "../types";

export const cardFooterStyles = stylex.create({
  base: {
    display: "flex",
    alignItems: "center",
    borderBottomLeftRadius: radii.xl,
    borderBottomRightRadius: radii.xl,
    borderTopWidth: "1px",
    backgroundColor: `color-mix(in oklab, ${colors.muted} 50%, transparent)`,
    padding: "var(--card-spacing)",
  },
});

export type CardFooterStyleProps = StyleXComponentProps<"div">;
