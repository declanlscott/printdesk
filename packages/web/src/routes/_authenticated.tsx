import { Replicache } from "@printworks/core/replicache/client";
import { usersTableName } from "@printworks/core/users/shared";
import { ApplicationError } from "@printworks/core/utils/errors";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { AuthenticatedLayout } from "~/layouts/authenticated";
import { checkRoutePermission } from "~/lib/access-control";
import { query } from "~/lib/hooks/data";

import type { UserRole } from "@printworks/core/users/shared";
import type { UserData } from "@printworks/core/users/sql";
import type { DeepReadonlyObject, ReadTransaction } from "replicache";
import type { routePermissions } from "~/lib/access-control";
import type { AuthenticatedEagerRouteId } from "~/types";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context, location }) => {
    const authStore = context.authStoreApi.getState();

    const user = await (async () => {
      try {
        await authStore.actions.verify();

        const user = authStore.user;
        if (!user) throw new ApplicationError.Unauthenticated();

        return user;
      } catch (e) {
        console.error(e);

        throw redirect({ to: "/login", search: { from: location.href } });
      }
    })();

    if (context.replicache.status !== "ready")
      throw redirect({ to: "/login", search: { from: location.href } });

    const replicache = context.replicache.client;

    const authorizeRoute = <
      TRouteId extends AuthenticatedEagerRouteId,
      TPermission extends (typeof routePermissions)[UserRole][TRouteId],
    >(
      routeId: TRouteId,
      ...input: TPermission extends (
        tx: ReadTransaction,
        user: DeepReadonlyObject<UserData>,
        ...input: infer TInput
      ) => unknown
        ? TInput
        : Array<never>
    ) =>
      replicache.query(async (tx) => {
        const access = await checkRoutePermission(
          tx,
          await Replicache.get(tx, usersTableName, user.id),
          routeId,
          ...input,
        );

        if (!access) throw new ApplicationError.AccessDenied();
      });

    return { user, replicache, authorizeRoute };
  },
  loader: async ({ context }) => {
    const [initialTenant, initialRooms, initialUser] = await Promise.all([
      context.replicache.query(query.tenant(context.user.tenantId)),
      context.replicache.query(query.rooms()),
      context.replicache.query(query.user(context.user.id)),
    ]);

    return { initialTenant, initialRooms, initialUser };
  },
  component: AuthenticatedLayout,
});
