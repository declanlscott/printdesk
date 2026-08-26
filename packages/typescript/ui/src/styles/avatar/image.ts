import * as stylex from "@stylexjs/stylex";

import { radii } from "../tokens.stylex";

import type { StyleXComponentProps } from "../types";

export const avatarImageStyles = stylex.create({
  loaded: {
    borderRadius: radii.full,
    aspectRatio: "1 / 1",
    objectFit: "cover",
    height: "100%",
    width: "100%",
  },
  loading: {
    display: "none",
  },
  error: {
    display: "none",
  },
});
export type AvatarImageState = keyof typeof avatarImageStyles;

export type AvatarImageStyleProps = StyleXComponentProps<"img">;
