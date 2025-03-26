import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";

import { router } from "~/api/trpc/routers";

export default new Hono().use(
  "/*",
  trpcServer({ router, createContext: (_, c) => ({ req: c.req, res: c.res }) }),
);
