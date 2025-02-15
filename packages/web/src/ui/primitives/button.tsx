import {
  Button as AriaButton,
  composeRenderProps,
} from "react-aria-components";

import { buttonStyles } from "~/styles/components/primitives/button";
import { Spinner } from "~/ui/primitives/spinner";

import type { ComponentProps } from "react";
import type { ButtonStyles } from "~/styles/components/primitives/button";

export interface ButtonProps
  extends ComponentProps<typeof AriaButton>,
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
    {(values) => (
      <>
        {isLoading ? <Spinner className="mr-2 size-4" /> : null}

        {typeof children === "function" ? children(values) : children}
      </>
    )}
  </AriaButton>
);
