import * as stylex from "@stylexjs/stylex";

import { leading, spacing } from "../tokens.stylex";

import type { StyleXComponentProps } from "../types";

export const fieldContentStyles = stylex.create({
  base: {
    display: "flex",
    flex: "1",
    flexDirection: "column",
    gap: spacing[0.5],
    lineHeight: leading.snug,
  },
});

export type FieldContentStyleProps = StyleXComponentProps<"div">;
