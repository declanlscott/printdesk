import {
  Button as AriaButton,
  composeRenderProps,
} from "react-aria-components";

import { iconButtonStyles } from "~/styles/components/primitives/icon-button";

import type { ComponentProps } from "react";

export type IconButtonProps = ComponentProps<typeof AriaButton>;

export const IconButton = ({ className, ...props }: IconButtonProps) => (
  <AriaButton
    {...props}
    className={composeRenderProps(className, (className, renderProps) =>
      iconButtonStyles({ ...renderProps, className }),
    )}
  />
);
