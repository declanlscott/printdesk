import { createFileRoute } from "@tanstack/react-router";

const routeId = "/_authenticated/users/$userId";

export const Route = createFileRoute(routeId)({
  beforeLoad: ({ context, params }) =>
    context.replicache.query((tx) =>
      context.authStore.actions.authorizeRoute(tx, routeId, params.userId),
    ),
  component: RouteComponent,
});

function RouteComponent() {
  return "TODO";
}
