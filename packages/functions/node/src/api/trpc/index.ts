import { initTRPC } from "@trpc/server";

import type { Context } from "hono";
import type { Meta } from "~/api/trpc/meta";

export const t = initTRPC
  .context<Pick<Context, "req" | "res">>()
  .meta<Meta>()
  .create();
