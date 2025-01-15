import { Link as AriaLink, composeRenderProps } from "react-aria-components";

import { linkStyles } from "~/styles/components/primitives/link";

import type { LinkProps as AriaLinkProps } from "react-aria-components";
import type { LinkStyles } from "~/styles/components/primitives/link";

export interface LinkProps extends AriaLinkProps, LinkStyles {}

export const Link = ({ className, variant, size, ...props }: LinkProps) => (
  <AriaLink
    {...props}
    className={composeRenderProps(className, (className, renderProps) =>
      linkStyles({ ...renderProps, variant, size, className }),
    )}
  />
);
