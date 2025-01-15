import { createFileRoute, Navigate } from "@tanstack/react-router";
import * as v from "valibot";

export const Route = createFileRoute("/register/")({
  validateSearch: v.object({ slug: v.optional(v.string()) }),
  component: RouteComponent,
});

function RouteComponent() {
  const { slug } = Route.useSearch();

  return <Navigate to="/register/1" search={{ slug }} />;
}
