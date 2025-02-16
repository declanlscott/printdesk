import { HttpError } from "@printworks/core/utils/errors";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";

import { proxy, rateLimiter } from "./middleware";

import type { FetchProxy } from "@mjackson/fetch-proxy";
import type { UserSubject } from "@printworks/core/auth/subjects";
import type { ContentfulStatusCode } from "hono/utils/http-status";

declare module "hono" {
  interface ContextVariableMap {
    subject: UserSubject;
    rateLimitOutcome: RateLimitOutcome;
    proxy: FetchProxy;
  }
}

export default new Hono()
  .use(logger())
  .use(rateLimiter)
  .use(proxy)
  .all("*", (c) => c.get("proxy")(c.req.raw))
  .onError((e, c) => {
    console.error(e);

    if (e instanceof HttpError.Error)
      return c.json(e.message, e.statusCode as ContentfulStatusCode);
    if (e instanceof HTTPException) return e.getResponse();

    return c.json("Internal server error", 500);
  });
