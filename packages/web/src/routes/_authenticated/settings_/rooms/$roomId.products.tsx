import { createFileRoute } from "@tanstack/react-router";

const routeId = "/_authenticated/settings_/rooms/$roomId/products";

export const Route = createFileRoute(routeId)({
  beforeLoad: ({ context }) => context.authorizeRoute(routeId),
  component: RouteComponent,
});

function RouteComponent() {
  return "TODO";
}
