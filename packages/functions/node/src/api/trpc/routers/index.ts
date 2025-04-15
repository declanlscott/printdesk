import { t } from "~/api/trpc";
import { authRouter } from "~/api/trpc/routers/auth";
import { filesRouter } from "~/api/trpc/routers/files";
import { realtimeRouter } from "~/api/trpc/routers/realtime";
import { servicesRouter } from "~/api/trpc/routers/services";
import { setupRouter } from "~/api/trpc/routers/setup";
import { tenantsRouter } from "~/api/trpc/routers/tenants";
import { usersRouter } from "~/api/trpc/routers/users";

export const router = t.router({
  auth: authRouter,
  files: filesRouter,
  services: servicesRouter,
  realtime: realtimeRouter,
  setup: setupRouter,
  tenants: tenantsRouter,
  users: usersRouter,
});

export type TrpcRouter = typeof router;
