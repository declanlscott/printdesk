import { Users } from "@printdesk/core/users/client";
import { createFileRoute } from "@tanstack/react-router";

import { useSubscribe } from "~/lib/hooks/replicache";

const routeId = "/_authenticated/users/$userId";

export const Route = createFileRoute(routeId)({
  beforeLoad: ({ context, params }) =>
    context.authorizeRoute(routeId, params.userId),
  loader: async ({ context, params }) => ({
    initialUser: await context.replicache.query(Users.byId(params.userId)),
  }),
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData.initialUser.name} | Printdesk` }],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { initialUser } = Route.useLoaderData();
  const user = useSubscribe(Users.byId(initialUser.id), {
    defaultData: initialUser,
  });

  return "TODO";
}
