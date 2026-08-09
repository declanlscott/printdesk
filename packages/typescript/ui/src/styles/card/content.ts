import * as stylex from "@stylexjs/stylex";

import type { StyleXComponentProps } from "../types";

export const cardContentStyles = stylex.create({
  base: {
    paddingInline: "var(--card-spacing)",
  },
});

export type CardContentStyleProps = StyleXComponentProps<"div">;
