import * as stylex from "@stylexjs/stylex";

import { colors, radii, spacing } from "../tokens.stylex";
import { avatarMarker } from "./markers.stylex";

import type { StyleXComponentProps } from "../types";

export const avatarBadgeStyles = stylex.create({
  base: {
    position: "absolute",
    right: spacing[0],
    bottom: spacing[0],
    zIndex: 10,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    color: colors.primaryForeground,
    backgroundBlendMode: "color",
    boxShadow: `0 0 0 2px ${colors.background}`,
    userSelect: "none",
    [stylex.when.ancestor('[data-size="sm"]', avatarMarker)]: {
      height: spacing[2],
      width: spacing[2],
    },
    [stylex.when.ancestor('[data-size="default"]', avatarMarker)]: {
      height: spacing[2.5],
      width: spacing[2.5],
    },
    [stylex.when.ancestor('[data-size="lg"]', avatarMarker)]: {
      height: spacing[3],
      width: spacing[3],
    },
  },
});

export type AvatarBadgeStyleProps = StyleXComponentProps<"span">;
