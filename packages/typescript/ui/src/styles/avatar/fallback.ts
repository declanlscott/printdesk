import * as stylex from "@stylexjs/stylex";

import { avatarImageMarker, avatarMarker } from "../markers.stylex";
import { colors, fontSizes, leading, radii } from "../tokens.stylex";

import type { StyleXComponentProps } from "../types";

export const avatarFallbackStyles = stylex.create({
  base: {
    display: {
      default: "flex",
      [stylex.when.anySibling('[data-state="loaded"]', avatarImageMarker)]: "none",
    },
    height: "100%",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.full,
    backgroundColor: colors.muted,
    fontSize: {
      default: fontSizes.sm,
      [stylex.when.ancestor('[data-size="sm"]', avatarMarker)]: fontSizes.xs,
    },
    lineHeight: {
      default: leading.sm,
      [stylex.when.ancestor('[data-size="sm"]', avatarMarker)]: leading.xs,
    },
    color: colors.mutedForeground,
  },
});

export type AvatarFallbackStyleProps = StyleXComponentProps<"div">;
