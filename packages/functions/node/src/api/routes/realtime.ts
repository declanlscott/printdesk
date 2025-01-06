import { Realtime } from "@printworks/core/realtime";
import { Hono } from "hono";
import { Resource } from "sst";

import {
  appsyncSigner,
  executeApiSigner,
  stsClient,
} from "~/api/middleware/aws";

export default new Hono()
  .use(executeApiSigner)
  .get("/url", async (c) => {
    const url = await Realtime.getUrl();

    return c.json({ url }, 200);
  })
  .get(
    "/auth",
    stsClient,
    appsyncSigner({
      forTenant: true,
      role: {
        name: Resource.Aws.tenant.realtimeSubscriberRole.name,
        sessionName: "RealtimeSubscriberSigner",
      },
    }),
    async (c) => {
      const auth = await Realtime.getAuth();

      return c.json({ auth }, 200);
    },
  );
