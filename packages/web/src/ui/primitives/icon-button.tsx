import {
  Button as AriaButton,
  composeRenderProps,
} from "react-aria-components";

import { iconButtonStyles } from "~/styles/components/primitives/icon-button";

import type { ComponentProps } from "react";
import type { ButtonProps as AriaButtonProps } from "react-aria-components";

export interface IconButtonProps
  extends AriaButtonProps,
    ComponentProps<typeof AriaButton> {}

export const IconButton = ({ className, ...props }: IconButtonProps) => (
  <AriaButton
    {...props}
    className={composeRenderProps(className, (className, renderProps) =>
      iconButtonStyles({ ...renderProps, className }),
    )}
  />
);
