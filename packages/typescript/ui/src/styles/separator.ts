import * as stylex from "@stylexjs/stylex";

import { colors, spacing } from "../styles/tokens.stylex";

import type { StyleXComponentProps } from "../styles/types";

export const separatorStyles = stylex.create({
  base: {
    display: "block",
    flexShrink: "0",
    borderWidth: spacing[0],
    backgroundColor: colors.border,
    [":is(hr)"]: {
      height: spacing.px,
      width: "100%",
    },
  },
});

export const separatorOrientations = stylex.create({
  horizontal: {
    height: spacing.px,
    width: "100%",
  },
  vertical: {
    height: "100%",
    width: spacing.px,
    alignSelf: "stretch",
  },
});
export type SeparatorOrientation = keyof typeof separatorOrientations;

interface HorizontalSeparatorStyleProps extends StyleXComponentProps<"hr"> {
  orientation?: "horizontal";
}
interface VerticalSeparatorStyleProps extends StyleXComponentProps<"div"> {
  orientation?: "vertical";
}
export type SeparatorStyleProps = HorizontalSeparatorStyleProps | VerticalSeparatorStyleProps;
