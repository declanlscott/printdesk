import {
  Button as AriaButton,
  composeRenderProps,
} from "react-aria-components";
import { Loader2 } from "lucide-react";

import { buttonStyles } from "~/styles/components/primitives/button";

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
        {isLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}

        {typeof children === "function" ? children(values) : children}
      </>
    )}
  </AriaButton>
);
