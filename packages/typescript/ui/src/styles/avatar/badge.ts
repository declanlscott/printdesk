import * as stylex from "@stylexjs/stylex";

import { avatarMarker } from "../markers.stylex";
import { colors, radii, spacing } from "../tokens.stylex";

import type { StyleXComponentProps } from "../types";

export const avatarBadgeStyles = stylex.create({
  base: {
    borderRadius: radii.full,
    alignItems: "center",
    backgroundBlendMode: "color",
    backgroundColor: colors.primary,
    boxShadow: `0 0 0 2px ${colors.background}`,
    color: colors.primaryForeground,
    display: "inline-flex",
    justifyContent: "center",
    position: "absolute",
    userSelect: "none",
    zIndex: 10,
    bottom: spacing[0],
    height: {
      [stylex.when.ancestor('[data-size="default"]', avatarMarker)]: spacing[2.5],
      [stylex.when.ancestor('[data-size="lg"]', avatarMarker)]: spacing[3],
      [stylex.when.ancestor('[data-size="sm"]', avatarMarker)]: spacing[2],
    },
    right: spacing[0],
    width: {
      [stylex.when.ancestor('[data-size="default"]', avatarMarker)]: spacing[2.5],
      [stylex.when.ancestor('[data-size="lg"]', avatarMarker)]: spacing[3],
      [stylex.when.ancestor('[data-size="sm"]', avatarMarker)]: spacing[2],
    },
  },
});

export type AvatarBadgeStyleProps = StyleXComponentProps<"span">;
