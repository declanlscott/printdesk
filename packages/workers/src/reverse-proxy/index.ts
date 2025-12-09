import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";

import { proxy, rateLimiter } from "./middleware";

import type { FetchProxy } from "@mjackson/fetch-proxy";
import type { AuthContract } from "@printdesk/core/auth/contract";

declare module "hono" {
  interface ContextVariableMap {
    subject: AuthContract.UserSubject;
    rateLimitOutcome: RateLimitOutcome;
    proxy: FetchProxy;
  }
}

export default new Hono()
  .use(logger())
  .use(rateLimiter)
  .use(proxy)
  .all("*", (c) => c.var.proxy(c.req.raw))
  .onError((e, c) => {
    console.error(e);

    if (e instanceof HTTPException) return e.getResponse();

    return c.newResponse(e.message, 500);
  });
