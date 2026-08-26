import * as stylex from "@stylexjs/stylex";

import { colors, radii } from "../tokens.stylex";

import type { StyleXComponentProps } from "../types";

export const cardFooterStyles = stylex.create({
  base: {
    padding: "var(--card-spacing)",
    alignItems: "center",
    backgroundColor: `color-mix(in oklab, ${colors.muted} 50%, transparent)`,
    display: "flex",
    borderBottomLeftRadius: radii.xl,
    borderBottomRightRadius: radii.xl,
    borderTopWidth: "1px",
  },
});

export type CardFooterStyleProps = StyleXComponentProps<"div">;
