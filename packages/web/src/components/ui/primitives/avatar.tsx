import * as RadixAvatar from "@radix-ui/react-avatar";

import { avatarStyles } from "~/styles/components/primitives/avatar";

import type { ComponentProps } from "react";

export type AvatarProps = ComponentProps<typeof RadixAvatar.Root>;
export const Avatar = ({ className, ...props }: AvatarProps) => (
  <RadixAvatar.Root className={avatarStyles().root({ className })} {...props} />
);

export type AvatarImageProps = ComponentProps<typeof RadixAvatar.Image>;
export const AvatarImage = ({ className, ...props }: AvatarImageProps) => (
  <RadixAvatar.Image
    className={avatarStyles().image({ className })}
    {...props}
  />
);

export type AvatarFallbackProps = ComponentProps<typeof RadixAvatar.Fallback>;
export const AvatarFallback = ({
  className,
  ...props
}: AvatarFallbackProps) => (
  <RadixAvatar.Fallback
    className={avatarStyles().fallback({ className })}
    {...props}
  />
);
