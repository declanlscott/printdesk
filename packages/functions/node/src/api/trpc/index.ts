import { initTRPC } from "@trpc/server";

import type { Context } from "hono";

export const t = initTRPC.context<Pick<Context, "req" | "res">>().create();
