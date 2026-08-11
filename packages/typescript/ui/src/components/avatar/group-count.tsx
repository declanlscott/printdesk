import * as stylex from "@stylexjs/stylex";

import { avatarGroupCountStyles } from "../../styles/avatar/group-count";

import type { AvatarGroupCountStyleProps } from "../../styles/avatar/group-count";

export function AvatarGroupCount({ sx, ...props }: AvatarGroupCountStyleProps) {
  return (
    <div
      {...stylex.props(avatarGroupCountStyles.base, sx)}
      data-slot="avatar-group-count"
      {...props}
    />
  );
}
