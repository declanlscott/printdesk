import { vValidator } from "@hono/valibot-validator";
import {
  getRealtimeAuth,
  getRealtimeUrl,
} from "@printworks/core/realtime/properties";
import { useTenant } from "@printworks/core/tenants/context";
import { Credentials } from "@printworks/core/utils/aws";
import { Hono } from "hono";
import { Resource } from "sst";
import * as v from "valibot";

import { appsyncSigner, executeApiSigner } from "~/api/middleware/aws";
import { authzHeadersValidator } from "~/api/middleware/validators";

export default new Hono()
  .get(
    "/url",
    executeApiSigner(() => ({
      RoleArn: Credentials.buildRoleArn(
        Resource.Aws.account.id,
        Resource.Aws.tenant.roles.apiAccess.nameTemplate,
        useTenant().id,
      ),
      RoleSessionName: "ApiGetRealtimeUrl",
    })),
    async (c) => {
      const url = await getRealtimeUrl();

      return c.json({ url }, 200);
    },
  )
  .get(
    "/auth",
    authzHeadersValidator,
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
      const auth = await getRealtimeAuth(
        true,
        JSON.stringify(c.req.valid("query")),
      );

      return c.json({ auth }, 200);
    },
  );
