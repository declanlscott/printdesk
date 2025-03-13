import { BillingAccounts } from "@printworks/core/billing-accounts/client";
import * as R from "remeda";

import type { UserRole } from "@printworks/core/users/shared";
import type { User } from "@printworks/core/users/sql";
import type { DeepReadonlyObject, ReadTransaction } from "replicache";
import type { AuthenticatedEagerRouteId } from "~/types";

export type RoutePermissions = Record<
  UserRole,
  Record<
    AuthenticatedEagerRouteId,
    | boolean
    | ((
        tx: ReadTransaction,
        user: DeepReadonlyObject<User>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...input: Array<any>
      ) => boolean | Promise<boolean>)
  >
>;

export const routePermissions = {
  administrator: {
    "/_authenticated/": true,
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
    "/_authenticated/": true,
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
    "/_authenticated/": true,
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
    "/_authenticated/users/$userId": async (tx, manager, userId: User["id"]) =>
      R.pipe(
        await BillingAccounts.allManagerAuthorizations()(tx),
        R.filter((authorization) => authorization.managerId === manager.id),
        R.map(R.prop("billingAccountId")),
        async (billingAccountIds) =>
          R.pipe(
            await BillingAccounts.allCustomerAuthorizations()(tx),
            R.filter((authorization) =>
              billingAccountIds.includes(authorization.billingAccountId),
            ),
            R.map(R.prop("customerId")),
            (customerIds) => customerIds.includes(userId),
          ),
      ),
  },
  customer: {
    "/_authenticated/": true,
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
  user: DeepReadonlyObject<User>,
  routeId: TRouteId,
  ...input: TPermission extends (
    tx: ReadTransaction,
    user: DeepReadonlyObject<User>,
    ...input: infer TInput
  ) => unknown
    ? TInput
    : Array<never>
) {
  const permission = (routePermissions as RoutePermissions)[user.role][routeId];

  return new Promise<boolean>((resolve) => {
    if (typeof permission === "boolean") return resolve(permission);

    return resolve(permission(tx, user, ...input));
  });
}
