import * as stylex from "@stylexjs/stylex";

import { colors, spacing } from "../styles/tokens.stylex";

import type { StyleXComponentProps } from "../styles/types";

const IS_HR = ":is(hr)";

export const separatorStyles = stylex.create({
  base: {
    borderWidth: spacing[0],
    backgroundColor: colors.border,
    display: "block",
    flexShrink: "0",
    height: {
      [IS_HR]: spacing.px,
    },
    width: {
      [IS_HR]: "100%",
    },
  },
});

export const separatorOrientations = stylex.create({
  horizontal: {
    height: spacing.px,
    width: "100%",
  },
  vertical: {
    alignSelf: "stretch",
    height: "100%",
    width: spacing.px,
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
