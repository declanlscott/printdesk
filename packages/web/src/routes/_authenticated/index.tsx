import { createFileRoute } from "@tanstack/react-router";

const routeId = "/_authenticated/";

export const Route = createFileRoute(routeId)({
  beforeLoad: ({ context }) => context.authorizeRoute(routeId),
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Dashboard</div>;
}
