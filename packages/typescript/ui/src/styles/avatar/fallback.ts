import * as stylex from "@stylexjs/stylex";

import { avatarImageMarker, avatarMarker } from "../markers.stylex";
import { colors, fontSizes, leading, radii } from "../tokens.stylex";

import type { StyleXComponentProps } from "../types";

export const avatarFallbackStyles = stylex.create({
  base: {
    borderRadius: radii.full,
    alignItems: "center",
    backgroundColor: colors.muted,
    color: colors.mutedForeground,
    display: {
      default: "flex",
      [stylex.when.anySibling('[data-state="loaded"]', avatarImageMarker)]: "none",
    },
    fontSize: {
      default: fontSizes.sm,
      [stylex.when.ancestor('[data-size="sm"]', avatarMarker)]: fontSizes.xs,
    },
    justifyContent: "center",
    lineHeight: {
      default: leading.sm,
      [stylex.when.ancestor('[data-size="sm"]', avatarMarker)]: leading.xs,
    },
    height: "100%",
    width: "100%",
  },
});

export type AvatarFallbackStyleProps = StyleXComponentProps<"div">;
