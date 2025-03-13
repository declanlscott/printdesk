import { Products } from "@printworks/core/products/client";
import { Rooms } from "@printworks/core/rooms/client";
import { createFileRoute } from "@tanstack/react-router";

const routeId = "/_authenticated/settings_/rooms/$roomId_/products/$productId/";

export const Route = createFileRoute(routeId)({
  beforeLoad: ({ context }) => context.authorizeRoute(routeId),
  loader: async ({ context, params }) => {
    const [initialRoom, initialProduct] = await Promise.all([
      context.replicache.query(Rooms.byId(params.roomId)),
      context.replicache.query(Products.byId(params.productId)),
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
