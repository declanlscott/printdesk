import * as stylex from "@stylexjs/stylex";

import { avatarMarker } from "../markers.stylex";
import { colors, fontSizes, leading, radii, spacing } from "../tokens.stylex";

import type { StyleXComponentProps } from "../types";

export const avatarGroupCountStyles = stylex.create({
  base: {
    position: "relative",
    display: "flex",
    height: {
      default: spacing[8],
      [stylex.when.anySibling('[data-size="sm"]', avatarMarker)]: spacing[6],
      [stylex.when.anySibling('[data-size="lg"]', avatarMarker)]: spacing[10],
    },
    width: {
      default: spacing[8],
      [stylex.when.anySibling('[data-size="sm"]', avatarMarker)]: spacing[6],
      [stylex.when.anySibling('[data-size="lg"]', avatarMarker)]: spacing[10],
    },
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.full,
    backgroundColor: colors.muted,
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
    color: colors.mutedForeground,
    boxShadow: `0 0 0 2px ${colors.background}`,
  },
});

export type AvatarGroupCountStyleProps = StyleXComponentProps<"div">;
