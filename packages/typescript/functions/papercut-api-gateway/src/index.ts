import { Hono } from "hono";
import { logger } from "hono/logger";

import { auth } from "./middleware/auth";
import { papercutApi } from "./middleware/papercut-api";

export default new Hono()
  .use(logger())
  .use(auth)
  .use(papercutApi)
  .onError((e, c) => {
    if ("getResponse" in e) return e.getResponse();

    return c.newResponse(e.message, 500);
  });
