import { initTRPC } from "@trpc/server";

import type { Actor } from "@printdesk/core/actors/shared";
import type { Context } from "hono";
import type { Bindings } from "~/api/types";

export const t = initTRPC
  .context<Pick<Context<{ Bindings: Bindings }>, "req" | "res" | "env">>()
  .meta<{ actor: Actor["kind"] }>()
  .create();
