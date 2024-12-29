import { query } from "~/app/lib/hooks/data";

import type { UserRole } from "@printworks/core/users/shared";
import type { User, UserWithProfile } from "@printworks/core/users/sql";
import type { DeepReadonlyObject, ReadTransaction } from "replicache";
import type { AuthenticatedEagerRouteId } from "~/app/types";

export type RoutePermissions = Record<
  UserRole,
  Record<
    AuthenticatedEagerRouteId,
    | boolean
    | ((
        tx: ReadTransaction,
        user: DeepReadonlyObject<UserWithProfile>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...input: Array<any>
      ) => boolean | Promise<boolean>)
  >
>;

export const routePermissions = {
  administrator: {
    "/_authenticated/dashboard": true,
    "/_authenticated/products/": true,
    "/_authenticated/settings/": true,
    "/_authenticated/settings/images": true,
    "/_authenticated/settings/services": true,
    "/_authenticated/settings/rooms": true,
    "/_authenticated/settings_/rooms/$roomId/": true,
    "/_authenticated/settings_/rooms/$roomId/configuration": true,
    "/_authenticated/settings_/rooms/$roomId/cost-scripts": true,
    "/_authenticated/settings_/rooms/$roomId/products": true,
    "/_authenticated/settings_/rooms/$roomId_/products/$productId/": true,
    "/_authenticated/users/": true,
    "/_authenticated/users/$userId": true,
  },
  operator: {
    "/_authenticated/dashboard": true,
    "/_authenticated/products/": true,
    "/_authenticated/settings/": true,
    "/_authenticated/settings/images": true,
    "/_authenticated/settings/services": false,
    "/_authenticated/settings/rooms": true,
    "/_authenticated/settings_/rooms/$roomId/": true,
    "/_authenticated/settings_/rooms/$roomId/configuration": true,
    "/_authenticated/settings_/rooms/$roomId/cost-scripts": true,
    "/_authenticated/settings_/rooms/$roomId/products": true,
    "/_authenticated/settings_/rooms/$roomId_/products/$productId/": true,
    "/_authenticated/users/": true,
    "/_authenticated/users/$userId": true,
  },
  manager: {
    "/_authenticated/dashboard": true,
    "/_authenticated/products/": true,
    "/_authenticated/settings/": true,
    "/_authenticated/settings/images": false,
    "/_authenticated/settings/services": false,
    "/_authenticated/settings/rooms": false,
    "/_authenticated/settings_/rooms/$roomId/": false,
    "/_authenticated/settings_/rooms/$roomId/configuration": false,
    "/_authenticated/settings_/rooms/$roomId/cost-scripts": false,
    "/_authenticated/settings_/rooms/$roomId/products": false,
    "/_authenticated/settings_/rooms/$roomId_/products/$productId/": false,
    "/_authenticated/users/": true,
    "/_authenticated/users/$userId": async (
      tx,
      manager,
      userId: User["id"],
    ) => {
      const getManagedCustomerIds = query.managedCustomerIds(manager.id);

      return getManagedCustomerIds(tx).then((customerIds) =>
        customerIds.includes(userId),
      );
    },
  },
  customer: {
    "/_authenticated/dashboard": true,
    "/_authenticated/products/": true,
    "/_authenticated/settings/": true,
    "/_authenticated/settings/images": false,
    "/_authenticated/settings/services": false,
    "/_authenticated/settings/rooms": false,
    "/_authenticated/settings_/rooms/$roomId/": false,
    "/_authenticated/settings_/rooms/$roomId/configuration": false,
    "/_authenticated/settings_/rooms/$roomId/cost-scripts": false,
    "/_authenticated/settings_/rooms/$roomId/products": false,
    "/_authenticated/settings_/rooms/$roomId_/products/$productId/": false,
    "/_authenticated/users/": true,
    "/_authenticated/users/$userId": (_, user, userId: User["id"]) =>
      user.id === userId,
  },
} satisfies RoutePermissions;

export async function checkRoutePermission<
  TRouteId extends AuthenticatedEagerRouteId,
  TPermission extends (typeof routePermissions)[UserRole][TRouteId],
>(
  tx: ReadTransaction,
  user: DeepReadonlyObject<UserWithProfile>,
  routeId: TRouteId,
  ...input: TPermission extends (
    tx: ReadTransaction,
    user: DeepReadonlyObject<UserWithProfile>,
    ...input: infer TInput
  ) => unknown
    ? TInput
    : Array<never>
) {
  const permission = (routePermissions as RoutePermissions)[user.profile.role][
    routeId
  ];

  return new Promise<boolean>((resolve) => {
    if (typeof permission === "boolean") return resolve(permission);

    return resolve(permission(tx, user, ...input));
  });
}
