import { SharedErrors } from "@printworks/core/errors/shared";
import { Replicache } from "@printworks/core/replicache/client";
import { Rooms } from "@printworks/core/rooms/client";
import { Tenants } from "@printworks/core/tenants/client";
import { Users } from "@printworks/core/users/client";
import { usersTableName } from "@printworks/core/users/shared";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { AuthenticatedLayout } from "~/layouts/authenticated";
import { checkRoutePermission } from "~/lib/access-control";

import type { UserRole } from "@printworks/core/users/shared";
import type { User } from "@printworks/core/users/sql";
import type { DeepReadonlyObject, ReadTransaction } from "replicache";
import type { routePermissions } from "~/lib/access-control";
import type { AuthenticatedEagerRouteId } from "~/types";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context, location, search }) => {
    const authStore = context.authStoreApi.getState();

    const user = await (async () => {
      try {
        await authStore.actions.verify(context.slug);

        const user = authStore.user;
        if (!user) throw new Error("User not authenticated");

        return user;
      } catch (e) {
        console.error(e);

        throw redirect({
          to: "/login",
          search: { ...search, from: location.href },
        });
      }
    })();

    if (context.replicache.status !== "ready")
      throw redirect({
        to: "/login",
        search: { ...search, from: location.href },
      });

    const replicache = context.replicache.client;

    const authorizeRoute = <
      TRouteId extends AuthenticatedEagerRouteId,
      TPermission extends (typeof routePermissions)[UserRole][TRouteId],
    >(
      routeId: TRouteId,
      ...input: TPermission extends (
        tx: ReadTransaction,
        user: DeepReadonlyObject<User>,
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

        if (!access) throw new SharedErrors.AccessDenied();
      });

    return { user, replicache, authorizeRoute };
  },
  loader: async ({ context }) => {
    const [initialTenant, initialRooms, initialUser] = await Promise.all([
      context.replicache.query(Tenants.get(context.user.tenantId)),
      context.replicache.query(Rooms.all()),
      context.replicache.query(Users.byId(context.user.id)),
    ]);

    return { initialTenant, initialRooms, initialUser };
  },
  component: AuthenticatedLayout,
});
