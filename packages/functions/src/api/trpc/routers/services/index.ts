import { t } from "~/api/trpc";
import { papercutRouter } from "~/api/trpc/routers/services/papercut";
import { tailscaleRouter } from "~/api/trpc/routers/services/tailscale";

import type { InferRouterIO, IO } from "~/api/trpc/types";

export const servicesRouter = t.router({
  papercut: papercutRouter,
  tailscale: tailscaleRouter,
});

export type ServicesRouterIO<TIO extends IO> = InferRouterIO<
  TIO,
  typeof servicesRouter
>;
