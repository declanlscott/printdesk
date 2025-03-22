import { vValidator } from "@hono/valibot-validator";
import { Realtime } from "@printworks/core/realtime";
import { useTenant } from "@printworks/core/tenants/context";
import { Credentials } from "@printworks/core/utils/aws";
import { Hono } from "hono";
import { Resource } from "sst";
import * as v from "valibot";

import { appsyncSigner, executeApiSigner } from "~/api/middleware/aws";
import { userAuthzHeadersValidator } from "~/api/middleware/validators";

export default new Hono()
  .get(
    "/url",
    userAuthzHeadersValidator,
    executeApiSigner(() => ({
      RoleArn: Credentials.buildRoleArn(
        Resource.Aws.account.id,
        Resource.Aws.tenant.roles.apiAccess.nameTemplate,
        useTenant().id,
      ),
      RoleSessionName: "ApiGetRealtimeUrl",
    })),
    async (c) => {
      const url = await Realtime.getUrl((await Realtime.getDns()).realtime);

      return c.json({ url }, 200);
    },
  )
  .get(
    "/auth",
    userAuthzHeadersValidator,
    vValidator(
      "query",
      v.object({
        channel: v.optional(v.pipe(v.string(), v.startsWith("/"))),
      }),
    ),
    executeApiSigner(() => ({
      RoleArn: Credentials.buildRoleArn(
        Resource.Aws.account.id,
        Resource.Aws.tenant.roles.apiAccess.nameTemplate,
        useTenant().id,
      ),
      RoleSessionName: "ApiGetRealtimeAuth",
    })),
    appsyncSigner(() => ({
      RoleArn: Credentials.buildRoleArn(
        Resource.Aws.account.id,
        Resource.Aws.tenant.roles.realtimeSubscriber.nameTemplate,
        useTenant().id,
      ),
      RoleSessionName: "TenantRealtimeSubscriber",
    })),
    async (c) => {
      const auth = await Realtime.getAuth(
        (await Realtime.getDns()).http,
        JSON.stringify(c.req.valid("query")),
      );

      return c.json({ auth }, 200);
    },
  );
