import { createLazyFileRoute } from "@tanstack/react-router";

export const Route = createLazyFileRoute("/_authenticated/products")({
  component: RouteComponent,
});

function RouteComponent() {
  return "TODO";
}
