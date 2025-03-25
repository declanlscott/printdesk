import { t } from "~/api/trpc";
import { papercutRouter } from "~/api/trpc/routers/services/papercut";
import { tailscaleRouter } from "~/api/trpc/routers/services/tailscale";

export const servicesRouter = t.router({
  papercut: papercutRouter,
  tailscale: tailscaleRouter,
});
