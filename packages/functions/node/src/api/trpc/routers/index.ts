import { t } from "~/api/trpc";
import { filesRouter } from "~/api/trpc/routers/files";
import { realtimeRouter } from "~/api/trpc/routers/realtime";
import { servicesRouter } from "~/api/trpc/routers/services";
import { setupRouter } from "~/api/trpc/routers/setup";
import { tenantsRouter } from "~/api/trpc/routers/tenants";
import { usersRouter } from "~/api/trpc/routers/users";

export const router = t.router({
  files: filesRouter,
  services: servicesRouter,
  realtime: realtimeRouter,
  setup: setupRouter,
  tenants: tenantsRouter,
  users: usersRouter,
});

export type Router = typeof router;
