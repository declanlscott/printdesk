import * as stylex from "@stylexjs/stylex";

import { avatarGroupStyles } from "../../styles/avatar/group";
import { avatarGroupMarker } from "../../styles/avatar/markers.stylex";

import type { AvatarGroupStyleProps } from "../../styles/avatar/group";

export function AvatarGroup({ sx, ...props }: AvatarGroupStyleProps) {
  return (
    <div
      {...stylex.props(avatarGroupStyles.base, avatarGroupMarker, sx)}
      data-slot="avatar-group"
      {...props}
    />
  );
}
