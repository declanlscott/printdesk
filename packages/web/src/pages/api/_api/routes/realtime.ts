import { Api } from "@printworks/core/api";
import { Realtime } from "@printworks/core/realtime";
import { Hono } from "hono";

import { authn } from "~/api/middleware/auth";
import { executeApiSigner } from "~/api/middleware/aws";

export default new Hono<{
  Variables: {
    domainNames: Awaited<ReturnType<typeof Api.getAppsyncEventsDomainNames>>;
  };
}>()
  .use(authn)
  .use(executeApiSigner, async (c, next) => {
    c.set("domainNames", await Api.getAppsyncEventsDomainNames());

    return next();
  })
  .get("/auth", async (c) => {
    const auth = await Realtime.getAuth(c.get("domainNames").http);

    return c.json({ auth }, 200);
  })
  .get("/url", async (c) => {
    const url = await Realtime.getUrl(c.get("domainNames").realtime);

    return c.json({ url }, 200);
  });
