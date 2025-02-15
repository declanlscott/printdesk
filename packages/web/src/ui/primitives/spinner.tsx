import { Loader2 } from "lucide-react";

import { spinnerStyles } from "~/styles/components/primitives/spinner";

import type { ComponentProps } from "react";
import type { SpinnerStyles } from "~/styles/components/primitives/spinner";

export interface SpinnerProps extends ComponentProps<"svg">, SpinnerStyles {}

export function Spinner({ className, ...props }: SpinnerProps) {
  return <Loader2 className={spinnerStyles({ className })} {...props} />;
}
