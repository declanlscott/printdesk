import { createLazyFileRoute } from "@tanstack/react-router";

export const Route = createLazyFileRoute("/_authenticated/products")({
  component: Component,
});

function Component() {
  return "TODO";
}
