import {
  Breadcrumb as AriaBreadcrumb,
  Breadcrumbs as AriaBreadcrumbs,
  Link as AriaLink,
  composeRenderProps,
} from "react-aria-components";
import { ChevronRight, MoreHorizontal } from "lucide-react";

import {
  breadcrumbLinkStyles,
  breadcrumbsStyles,
} from "~/styles/components/primitives/breadcrumbs";

import type { ComponentProps } from "react";
import type { BreadcrumbsProps as AriaBreadcrumbsProps } from "react-aria-components";

export type BreadcrumbsProps<TItem extends object> =
  AriaBreadcrumbsProps<TItem> & ComponentProps<typeof AriaBreadcrumbs>;
export const Breadcrumbs = <TItem extends object>({
  className,
  ...props
}: BreadcrumbsProps<TItem>) => (
  <AriaBreadcrumbs
    className={breadcrumbsStyles().root({ className })}
    {...props}
  />
);

export type BreadcrumbItemProps = ComponentProps<typeof AriaBreadcrumb>;
export const BreadcrumbItem = ({
  className,
  ...props
}: BreadcrumbItemProps) => (
  <AriaBreadcrumb
    className={composeRenderProps(className, (className, renderProps) =>
      breadcrumbsStyles().item({ className, ...renderProps }),
    )}
    {...props}
  />
);

export type BreadcrumbLinkProps = ComponentProps<typeof AriaLink>;
export const BreadcrumbLink = ({
  className,
  ...props
}: BreadcrumbLinkProps) => (
  <AriaLink
    className={composeRenderProps(className, (className, renderProps) =>
      breadcrumbLinkStyles({ className, ...renderProps }),
    )}
    {...props}
  />
);

export type BreadcrumbSeparatorProps = ComponentProps<"span">;
export const BreadcrumbSeparator = ({
  children,
  className,
  ...props
}: BreadcrumbSeparatorProps) => (
  <span
    role="presentation"
    aria-hidden="true"
    className={breadcrumbsStyles().separator({ className })}
    {...props}
  >
    {children ?? <ChevronRight />}
  </span>
);

export type BreadcrumbEllipsisProps = ComponentProps<"span">;
export const BreadcrumbEllipsis = ({
  className,
  ...props
}: BreadcrumbEllipsisProps) => (
  <span
    role="presentation"
    aria-hidden="true"
    className={breadcrumbsStyles().ellipsis({ className })}
    {...props}
  >
    <MoreHorizontal className="size-4" />

    <span className="sr-only">More</span>
  </span>
);

export type BreadcrumbPageProps = ComponentProps<typeof AriaLink>;
export const BreadcrumbPage = ({
  className,
  ...props
}: BreadcrumbPageProps) => (
  <AriaLink
    className={composeRenderProps(className, (className, renderProps) =>
      breadcrumbsStyles().page({ className, ...renderProps }),
    )}
    {...props}
  />
);
