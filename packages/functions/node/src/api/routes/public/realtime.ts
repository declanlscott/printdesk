import { vValidator } from "@hono/valibot-validator";
import {
  getRealtimeAuth,
  getRealtimeUrl,
} from "@printworks/core/realtime/properties";
import { Hono } from "hono";
import { Resource } from "sst";
import * as v from "valibot";

import { appsyncSigner } from "~/api/middleware/aws";

export default new Hono()
  .get("/url", async (c) => {
    const url = await getRealtimeUrl(false);

    return c.json({ url }, 200);
  })
  .get(
    "/auth",
    vValidator(
      "query",
      v.object({
        channel: v.optional(v.pipe(v.string(), v.startsWith("/"))),
      }),
    ),
    appsyncSigner(() => ({
      RoleArn: Resource.Aws.roles.realtimeSubscriber.arn,
      RoleSessionName: "PublicRealtimeSubscriber",
    })),
    async (c) => {
      const auth = await getRealtimeAuth(
        false,
        JSON.stringify(c.req.valid("query")),
      );

      return c.json({ auth }, 200);
    },
  );
