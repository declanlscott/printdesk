import {
  Button as AriaButton,
  composeRenderProps,
} from "react-aria-components";

import { buttonStyles } from "~/styles/components/primitives/button";
import { Spinner } from "~/ui/primitives/spinner";

import type { ComponentProps } from "react";
import type { ButtonProps as AriaButtonProps } from "react-aria-components";
import type { ButtonStyles } from "~/styles/components/primitives/button";

export interface ButtonProps
  extends AriaButtonProps,
    ComponentProps<typeof AriaButton>,
    ButtonStyles {
  isLoading?: boolean;
}

export const Button = ({
  children,
  isDisabled,
  isLoading,
  variant,
  size,
  ...props
}: ButtonProps) => (
  <AriaButton
    {...props}
    isDisabled={isLoading ?? isDisabled}
    className={composeRenderProps(props.className, (className, renderProps) =>
      buttonStyles({
        ...renderProps,
        variant,
        size,
        className,
      }),
    )}
  >
    {composeRenderProps(children, (children) => (
      <>
        {isLoading ? <Spinner className="mr-2 size-4" /> : null}

        {children}
      </>
    ))}
  </AriaButton>
);
