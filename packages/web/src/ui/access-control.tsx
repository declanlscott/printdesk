import { AccessControl } from "@printworks/core/access-control/client";

import { checkRoutePermission } from "~/lib/access-control";
import { useSubscribe } from "~/lib/hooks/replicache";
import { useUser } from "~/lib/hooks/user";

import type { PropsWithChildren, ReactNode } from "react";
import type { Action, Resource } from "@printworks/core/access-control/shared";
import type { UserRole } from "@printworks/core/users/shared";
import type { UserWithProfile } from "@printworks/core/users/sql";
import type {
  DeepReadonlyObject,
  ReadTransaction,
  WriteTransaction,
} from "replicache";
import type { routePermissions } from "~/lib/access-control";
import type { AuthenticatedEagerRouteId } from "~/types";

export type EnforceAbacProps<
  TResource extends Resource,
  TAction extends Action,
  TPermission extends
    (typeof AccessControl.permissions)[UserRole][TResource][TAction],
> = PropsWithChildren<{
  resource: TResource;
  action: TAction;
  input: TPermission extends (
    tx: ReadTransaction | WriteTransaction,
    user: DeepReadonlyObject<UserWithProfile>,
    ...input: infer TInput
  ) => unknown
    ? TInput
    : Array<never>;
  unauthorized?: ReactNode;
}>;

export function EnforceAbac<
  TResource extends Resource,
  TAction extends Action,
  TPermission extends
    (typeof AccessControl.permissions)[UserRole][TResource][TAction],
>({
  resource,
  action,
  input,
  unauthorized = null,
  children,
}: EnforceAbacProps<TResource, TAction, TPermission>) {
  const user = useUser();

  const hasAccess = useSubscribe(
    (tx) => AccessControl.check(tx, user, resource, action, ...input),
    { defaultData: false },
  );

  if (!hasAccess) return <>{unauthorized}</>;

  return <>{children}</>;
}

export type EnforceRouteAbacProps<
  TRouteId extends AuthenticatedEagerRouteId,
  TPermission extends (typeof routePermissions)[UserRole][TRouteId],
> = PropsWithChildren<{
  routeId: TRouteId;
  input: TPermission extends (
    tx: ReadTransaction,
    user: DeepReadonlyObject<UserWithProfile>,
    ...input: infer TInput
  ) => unknown
    ? TInput
    : Array<never>;
  unauthorized?: ReactNode;
}>;

export function EnforceRouteAbac<
  TRouteId extends AuthenticatedEagerRouteId,
  TPermission extends (typeof routePermissions)[UserRole][TRouteId],
>({
  routeId,
  input,
  unauthorized = null,
  children,
}: EnforceRouteAbacProps<TRouteId, TPermission>) {
  const user = useUser();

  const hasAccess = useSubscribe(
    (tx) => checkRoutePermission(tx, user, routeId, ...input),
    { defaultData: false },
  );

  if (!hasAccess) return <>{unauthorized}</>;

  return <>{children}</>;
}
