import { createFileRoute } from "@tanstack/react-router";

const routeId = "/_authenticated/products/";

export const Route = createFileRoute(routeId)({
  beforeLoad: ({ context }) => context.authorizeRoute(routeId),
  head: () => ({ meta: [{ title: "Products | Printdesk" }] }),
  component: RouteComponent,
});

function RouteComponent() {
  return "TODO";
}
