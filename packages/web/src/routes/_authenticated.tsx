import { createFileRoute, redirect } from "@tanstack/react-router";

import { AuthenticatedLayout } from "~/layouts/authenticated";
import { query } from "~/lib/hooks/data";
import { initialLoginSearchParams } from "~/lib/schemas";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ context, location }) => {
    const actor = context.auth.authenticateRoute(location.href);

    if (context.replicache.status !== "ready")
      throw redirect({
        to: "/login",
        search: { redirect: location.href, ...initialLoginSearchParams },
      });

    return { actor, replicache: context.replicache.client };
  },
  loader: async ({ context }) => {
    const [initialTenant, initialRooms, initialUser] = await Promise.all([
      context.replicache.query(query.tenant(context.actor.properties.tenantId)),
      context.replicache.query(query.rooms()),
      context.replicache.query(query.user(context.actor.properties.id)),
    ]);

    return { initialTenant, initialRooms, initialUser };
  },
  component: AuthenticatedLayout,
});
