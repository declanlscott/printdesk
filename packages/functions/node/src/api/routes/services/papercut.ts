import { vValidator } from "@hono/valibot-validator";
import { Papercut } from "@printworks/core/papercut";
import {
  updateServerAuthTokenSchema,
  updateServerTailnetUriSchema,
} from "@printworks/core/papercut/shared";
import { Api } from "@printworks/core/tenants/api";
import { Credentials } from "@printworks/core/utils/aws";
import { Hono } from "hono";
import { Resource } from "sst";

import { authz } from "~/api/middleware/auth";
import { executeApiSigner, ssmClient } from "~/api/middleware/aws";
import { user } from "~/api/middleware/user";
import { authzValidator } from "~/api/middleware/validators";

export default new Hono()
  .use(user)
  .put(
    "/server/tailnet-uri",
    authz("services", "update"),
    authzValidator,
    vValidator("json", updateServerTailnetUriSchema),
    executeApiSigner,
    ssmClient(async () => ({
      RoleArn: Credentials.buildRoleArn(
        await Api.getAccountId(),
        Resource.Aws.tenant.roles.putParameters.name,
      ),
      RoleSessionName: "ApiSetTailnetPapercutServerUri",
    })),
    async (c) => {
      await Papercut.setTailnetServerUri(c.req.valid("json").tailnetUri);

      return c.body(null, 204);
    },
  )
  .put(
    "/server/auth-token",
    authz("services", "update"),
    authzValidator,
    vValidator("json", updateServerAuthTokenSchema),
    executeApiSigner,
    ssmClient(async () => ({
      RoleArn: Credentials.buildRoleArn(
        await Api.getAccountId(),
        Resource.Aws.tenant.roles.putParameters.name,
      ),
      RoleSessionName: "ApiSetPapercutServerAuthToken",
    })),
    async (c) => {
      await Papercut.setServerAuthToken(c.req.valid("json").authToken);

      return c.body(null, 204);
    },
  )
  .post(
    "/sync",
    authz("papercut-sync", "create"),
    executeApiSigner,
    async (c) => {
      const { eventId } = await Api.papercutSync();

      return c.json({ eventId }, 200);
    },
  );
