import * as stylex from "@stylexjs/stylex";

import { avatarSizes, avatarStyles } from "../../styles/avatar";
import { avatarMarker } from "../../styles/markers.stylex";

import type { AvatarStyleProps } from "../../styles/avatar";
export type AvatarProps = AvatarStyleProps;

export function Avatar({ size = "default", sx, ...props }: AvatarProps) {
  return (
    <div
      {...stylex.props(avatarStyles.base, avatarSizes[size], avatarMarker, sx)}
      data-slot="avatar"
      data-size={size}
      {...props}
    />
  );
}
