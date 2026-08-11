import * as stylex from "@stylexjs/stylex";

import type { StyleXComponentProps } from "../types";

export const avatarGroupStyles = stylex.create({
  base: {
    display: "flex",
  },
});

export type AvatarGroupStyleProps = StyleXComponentProps<"div">;
