import * as stylex from "@stylexjs/stylex";

import { avatarBadgeStyles } from "../../styles/avatar/badge";

import type { AvatarBadgeStyleProps } from "../../styles/avatar/badge";

export function AvatarBadge({ sx, ...props }: AvatarBadgeStyleProps) {
  return <span {...stylex.props(avatarBadgeStyles.base, sx)} data-slot="avatar-badge" {...props} />;
}
