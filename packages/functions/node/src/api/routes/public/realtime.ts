import { Realtime } from "@printworks/core/realtime";
import { Hono } from "hono";

import { appsyncSigner } from "~/api/middleware/aws";

export default new Hono()
  .get("/url", async (c) => {
    const url = await Realtime.getUrl(false);

    return c.json({ url }, 200);
  })
  .get("/auth", appsyncSigner({ forTenant: false }), async (c) => {
    const auth = await Realtime.getAuth(false);

    return c.json({ auth }, 200);
  });
