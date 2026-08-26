import * as stylex from "@stylexjs/stylex";

import { leading, spacing } from "../tokens.stylex";

import type { StyleXComponentProps } from "../types";

export const fieldContentStyles = stylex.create({
  base: {
    flex: "1",
    gap: spacing[0.5],
    display: "flex",
    flexDirection: "column",
    lineHeight: leading.snug,
  },
});

export type FieldContentStyleProps = StyleXComponentProps<"div">;
