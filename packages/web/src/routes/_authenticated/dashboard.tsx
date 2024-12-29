import { createFileRoute } from "@tanstack/react-router";

const routeId = "/_authenticated/dashboard";

export const Route = createFileRoute(routeId)({
  beforeLoad: ({ context }) =>
    context.replicache.query((tx) =>
      context.auth.authorizeRoute(tx, context.actor.properties.id, routeId),
    ),
  component: Component,
});

function Component() {
  return "TODO";
}
