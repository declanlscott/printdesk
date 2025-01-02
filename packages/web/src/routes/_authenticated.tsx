import { createFileRoute, redirect } from "@tanstack/react-router";

import { AuthenticatedLayout } from "~/layouts/authenticated";
import { query } from "~/lib/hooks/data";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context, location }) => {
    const user = await context.authStore.actions.authenticateRoute(
      location.href,
    );

    if (context.replicache.status !== "ready")
      throw redirect({ to: "/login", search: { from: location.href } });

    return { user, replicache: context.replicache.client };
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
