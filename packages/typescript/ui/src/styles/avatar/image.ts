import * as stylex from "@stylexjs/stylex";

import { radii } from "../tokens.stylex";

import type { StyleXComponentProps } from "../types";

export const avatarImageStyles = stylex.create({
  loaded: {
    aspectRatio: "1 / 1",
    width: "100%",
    height: "100%",
    borderRadius: radii.full,
    objectFit: "cover",
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
