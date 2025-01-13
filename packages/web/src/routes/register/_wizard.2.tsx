import { createFileRoute } from "@tanstack/react-router";

import { useRouteApi } from "~/lib/hooks/route-api";

export const Route = createFileRoute("/register/_wizard/2")({
  component: RouteComponent,
});

function RouteComponent() {
  const slug = useRouteApi("/register/_wizard").useLoaderData();

  return <div>Hello "/register/_wizard/2"!</div>;
}
