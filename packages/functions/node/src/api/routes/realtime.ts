import { Realtime } from "@printworks/core/realtime";
import { Api } from "@printworks/core/tenants/api";
import { Credentials } from "@printworks/core/utils/aws";
import { Hono } from "hono";
import { Resource } from "sst";

import { appsyncSigner, executeApiSigner } from "~/api/middleware/aws";

export default new Hono()
  .use(executeApiSigner)
  .get("/url", async (c) => {
    const url = await Realtime.getUrl();

    return c.json({ url }, 200);
  })
  .get(
    "/auth",
    appsyncSigner({
      RoleArn: Credentials.buildRoleArn(
        await Api.getAccountId(),
        Resource.Aws.tenant.roles.realtimeSubscriber.name,
      ),
      RoleSessionName: "TenantRealtimeSubscriber",
    }),
    async (c) => {
      const auth = await Realtime.getAuth();

      return c.json({ auth }, 200);
    },
  );
