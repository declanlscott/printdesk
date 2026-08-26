import * as stylex from "@stylexjs/stylex";

import { avatarMarker } from "../markers.stylex";
import { colors, fontSizes, leading, radii, spacing } from "../tokens.stylex";

import type { StyleXComponentProps } from "../types";

export const avatarGroupCountStyles = stylex.create({
  base: {
    borderRadius: radii.full,
    alignItems: "center",
    backgroundColor: colors.muted,
    boxShadow: `0 0 0 2px ${colors.background}`,
    color: colors.mutedForeground,
    display: "flex",
    flexShrink: 0,
    fontSize: fontSizes.sm,
    justifyContent: "center",
    lineHeight: leading.sm,
    position: "relative",
    height: {
      default: spacing[8],
      [stylex.when.anySibling('[data-size="lg"]', avatarMarker)]: spacing[10],
      [stylex.when.anySibling('[data-size="sm"]', avatarMarker)]: spacing[6],
    },
    width: {
      default: spacing[8],
      [stylex.when.anySibling('[data-size="lg"]', avatarMarker)]: spacing[10],
      [stylex.when.anySibling('[data-size="sm"]', avatarMarker)]: spacing[6],
    },
  },
});

export type AvatarGroupCountStyleProps = StyleXComponentProps<"div">;
