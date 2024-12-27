import { Realtime } from "@printworks/core/realtime";
import { Hono } from "hono";
import { Resource } from "sst";

import { authn } from "~/api/middleware/auth";
import {
  appsyncSigner,
  executeApiSigner,
  stsClient,
} from "~/api/middleware/aws";

export default new Hono()
  .use(authn)
  .use(executeApiSigner)
  .get(
    "/auth",
    stsClient,
    appsyncSigner(
      Resource.Aws.tenant.realtimeSubscriberRole.name,
      "RealtimeSubscriberSigner",
    ),
    async (c) => {
      const auth = await Realtime.getAuth();

      return c.json({ auth }, 200);
    },
  )
  .get("/url", async (c) => {
    const url = await Realtime.getUrl();

    return c.json({ url }, 200);
  });
