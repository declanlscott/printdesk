import { vValidator } from "@hono/valibot-validator";
import { Realtime } from "@printworks/core/realtime";
import { Hono } from "hono";
import { Resource } from "sst";
import * as v from "valibot";

import { appsyncSigner, stsClient } from "~/api/middleware/aws";

export default new Hono()
  .get("/url", async (c) => {
    const url = await Realtime.getUrl(false);

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
    stsClient,
    appsyncSigner({
      arn: Resource.Aws.roles.realtimeSubscriber.arn,
      sessionName: "PublicRealtimeSubscriberSigner",
    }),
    async (c) => {
      const auth = await Realtime.getAuth(
        false,
        JSON.stringify(c.req.valid("query")),
      );

      return c.json({ auth }, 200);
    },
  );
