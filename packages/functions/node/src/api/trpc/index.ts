import { initTRPC } from "@trpc/server";

import type { Actor } from "@printdesk/core/actors/shared";
import type { Context } from "hono";

export const t = initTRPC
  .context<Pick<Context, "req" | "res">>()
  .meta<{ actor: Actor["kind"] }>()
  .create();
