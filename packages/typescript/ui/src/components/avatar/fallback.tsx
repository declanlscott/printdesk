import * as stylex from "@stylexjs/stylex";

import { avatarFallbackStyles } from "../../styles/avatar/fallback";

import type { AvatarImageStyleProps as AvatarFallbackStyleProps } from "../../styles/avatar/image";

export type AvatarProps = AvatarFallbackStyleProps;

export function AvatarFallback({ sx, ...props }: AvatarProps) {
  return (
    <div {...stylex.props(avatarFallbackStyles.base, sx)} data-slot="avatar-fallback" {...props} />
  );
}
