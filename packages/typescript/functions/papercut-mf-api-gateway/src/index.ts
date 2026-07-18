import { Hono } from "hono";
import { logger } from "hono/logger";

import { api } from "./middleware/api";
import { auth } from "./middleware/auth";

export default new Hono()
  .use(logger())
  .use(auth)
  .use(api)
  .onError((e, c) => {
    if ("getResponse" in e) return e.getResponse();
    return c.newResponse(e.message, 500);
  });
