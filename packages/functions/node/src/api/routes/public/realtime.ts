import { vValidator } from "@hono/valibot-validator";
import { Realtime } from "@printworks/core/realtime";
import { Hono } from "hono";
import { Resource } from "sst";
import * as v from "valibot";

import { authn } from "~/api/middleware/auth";
import { appsyncSigner } from "~/api/middleware/aws";
import { systemAuthzHeadersValidator } from "~/api/middleware/validators";

export default new Hono()
  .use(authn("system"))
  .get("/url", systemAuthzHeadersValidator, async (c) => {
    const url = await Realtime.getUrl();

    return c.json({ url }, 200);
  })
  .get(
    "/auth",
    systemAuthzHeadersValidator,
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
      const auth = await Realtime.getAuth(JSON.stringify(c.req.valid("query")));

      return c.json({ auth }, 200);
    },
  );
