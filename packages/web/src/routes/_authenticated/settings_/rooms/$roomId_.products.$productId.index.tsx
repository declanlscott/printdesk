import { createFileRoute } from "@tanstack/react-router";

import { query } from "~/lib/hooks/data";

const routeId = "/_authenticated/settings_/rooms/$roomId_/products/$productId/";

export const Route = createFileRoute(routeId)({
  beforeLoad: ({ context }) => context.authorizeRoute(routeId),
  loader: async ({ context, params }) => {
    const [initialRoom, initialProduct] = await Promise.all([
      context.replicache.query(query.room(params.roomId)),
      context.replicache.query(query.product(params.productId)),
    ]);

    return {
      initialRoom,
      initialProduct,
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  return "TODO";
}
