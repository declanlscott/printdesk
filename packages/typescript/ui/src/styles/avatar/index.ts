import * as stylex from "@stylexjs/stylex";

import { colors, modes, radii, spacing } from "../tokens.stylex";
import { avatarGroupMarker } from "./markers.stylex";

import type { StyleXComponentProps } from "../types";

const AFTER = "::after";

export const avatarStyles = stylex.create({
  base: {
    position: "relative",
    display: "flex",
    flexShrink: 0,
    borderRadius: radii.full,
    userSelect: "none",
    [AFTER]: {
      content: "",
      position: "absolute",
      inset: spacing[0],
      borderRadius: radii.full,
      borderWidth: spacing.px,
      borderColor: colors.border,
      mixBlendMode: {
        default: null,
        [modes.light]: "darken",
        [modes.dark]: "lighten",
      },
    },
    [stylex.when.ancestor('[data-slot="avatar-group"]', avatarGroupMarker)]: {
      ":not(:last-child)": {
        boxShadow: `0 0 0 2px ${colors.background}`,
        marginInlineEnd: spacing[-2],
      },
    },
  },
});

export const avatarSizes = stylex.create({
  sm: {
    height: spacing[6],
    width: spacing[6],
  },
  default: {
    height: spacing[8],
    width: spacing[8],
  },
  lg: {
    height: spacing[10],
    width: spacing[10],
  },
});
export type AvatarSize = keyof typeof avatarSizes;

export interface AvatarStyleProps extends StyleXComponentProps<"div"> {
  size?: AvatarSize;
}
