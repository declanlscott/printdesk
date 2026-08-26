import * as stylex from "@stylexjs/stylex";

import { avatarGroupMarker } from "../markers.stylex";
import { colors, modes, radii, spacing } from "../tokens.stylex";

import type { StyleXComponentProps } from "../types";

const AFTER = "::after";

export const avatarStyles = stylex.create({
  base: {
    [AFTER]: {
      inset: spacing[0],
      borderColor: colors.border,
      borderRadius: radii.full,
      borderWidth: spacing.px,
      content: "",
      mixBlendMode: {
        default: null,
        [modes.light]: "darken",
        [modes.dark]: "lighten",
      },
      position: "absolute",
    },
    // oxlint-disable-next-line @stylexjs/valid-styles
    [stylex.when.ancestor('[data-slot="avatar-group"]', avatarGroupMarker)]: {
      ":not(:last-child)": {
        boxShadow: `0 0 0 2px ${colors.background}`,
        marginInlineEnd: spacing[-2],
      },
    },
    borderRadius: radii.full,
    display: "flex",
    flexShrink: 0,
    marginInlineEnd: {},
    position: "relative",
    userSelect: "none",
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
