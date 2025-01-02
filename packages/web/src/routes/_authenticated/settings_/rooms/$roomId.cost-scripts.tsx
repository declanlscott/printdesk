import { createFileRoute } from "@tanstack/react-router";

const routeId = "/_authenticated/settings_/rooms/$roomId/cost-scripts";

export const Route = createFileRoute(routeId)({
  beforeLoad: ({ context }) =>
    context.replicache.query((tx) =>
      context.authStore.actions.authorizeRoute(tx, routeId),
    ),
  component: RouteComponent,
});

function RouteComponent() {
  return "TODO";
}
