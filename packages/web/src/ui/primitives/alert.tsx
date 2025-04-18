import {
  alertDescriptionStyles,
  alertStyles,
  alertTitleStyles,
} from "~/styles/components/primitives/alert";

import type { ComponentProps } from "react";
import type { AlertStyles } from "~/styles/components/primitives/alert";

export interface AlertProps extends ComponentProps<"div">, AlertStyles {}
export const Alert = ({ className, variant, ...props }: AlertProps) => (
  <div
    role="alert"
    className={alertStyles({ variant, className })}
    {...props}
  />
);

export type AlertTitleProps = ComponentProps<"h5">;
export const AlertTitle = ({ className, ...props }: AlertTitleProps) => (
  <h5 className={alertTitleStyles({ className })} {...props} />
);

export type AlertDescriptionProps = ComponentProps<"div">;
export const AlertDescription = ({
  className,
  ...props
}: AlertDescriptionProps) => (
  <div className={alertDescriptionStyles({ className })} {...props} />
);
