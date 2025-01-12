import { vValidator } from "@hono/valibot-validator";
import { Realtime } from "@printworks/core/realtime";
import { Api } from "@printworks/core/tenants/api";
import { Credentials } from "@printworks/core/utils/aws";
import { Hono } from "hono";
import { Resource } from "sst";
import * as v from "valibot";

import { appsyncSigner, executeApiSigner } from "~/api/middleware/aws";
import { authzValidator } from "~/api/middleware/validators";

export default new Hono()
  .use(executeApiSigner)
  .get("/url", async (c) => {
    const url = await Realtime.getUrl();

    return c.json({ url }, 200);
  })
  .get(
    "/auth",
    authzValidator,
    vValidator(
      "query",
      v.object({
        channel: v.optional(v.pipe(v.string(), v.startsWith("/"))),
      }),
    ),
    appsyncSigner(async () => ({
      RoleArn: Credentials.buildRoleArn(
        await Api.getAccountId(),
        Resource.Aws.tenant.roles.realtimeSubscriber.name,
      ),
      RoleSessionName: "TenantRealtimeSubscriber",
    })),
    async (c) => {
      const auth = await Realtime.getAuth(
        true,
        JSON.stringify(c.req.valid("query")),
      );

      return c.json({ auth }, 200);
    },
  );
