import { Products } from "@printdesk/core/products/client";
import { Rooms } from "@printdesk/core/rooms/client";
import { createFileRoute } from "@tanstack/react-router";

import { useSubscribe } from "~/lib/hooks/replicache";

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
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData.initialProduct.name} | Printdesk` }],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { initialProduct } = Route.useLoaderData();
  const product = useSubscribe(Products.byId(initialProduct.id), {
    defaultData: initialProduct,
  });

  return "TODO";
}
