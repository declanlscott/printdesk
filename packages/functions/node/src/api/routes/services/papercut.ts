import { vValidator } from "@hono/valibot-validator";
import { Api } from "@printworks/core/backend/api";
import { Papercut } from "@printworks/core/papercut";
import {
  updateServerAuthTokenSchema,
  updateServerTailnetUriSchema,
} from "@printworks/core/papercut/shared";
import { Tenants } from "@printworks/core/tenants";
import { useTenant } from "@printworks/core/tenants/context";
import { Credentials } from "@printworks/core/utils/aws";
import { HttpError } from "@printworks/core/utils/errors";
import { Hono } from "hono";
import { Resource } from "sst";

import { authz } from "~/api/middleware/auth";
import { executeApiSigner, ssmClient } from "~/api/middleware/aws";
import { user } from "~/api/middleware/user";
import { userAuthzHeadersValidator } from "~/api/middleware/validators";

export default new Hono()
  .use(user)
  .put(
    "/server/tailnet-uri",
    authz("services", "update"),
    userAuthzHeadersValidator,
    vValidator("json", updateServerTailnetUriSchema),
    ssmClient(() => ({
      RoleArn: Credentials.buildRoleArn(
        Resource.Aws.account.id,
        Resource.Aws.tenant.roles.putParameters.nameTemplate,
        useTenant().id,
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
    userAuthzHeadersValidator,
    vValidator("json", updateServerAuthTokenSchema),
    ssmClient(() => ({
      RoleArn: Credentials.buildRoleArn(
        Resource.Aws.account.id,
        Resource.Aws.tenant.roles.putParameters.nameTemplate,
        useTenant().id,
      ),
      RoleSessionName: "ApiSetPapercutServerAuthToken",
    })),
    executeApiSigner(() => ({
      RoleArn: Credentials.buildRoleArn(
        Resource.Aws.account.id,
        Resource.Aws.tenant.roles.apiAccess.nameTemplate,
        useTenant().id,
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
    userAuthzHeadersValidator,
    executeApiSigner(() => ({
      RoleArn: Credentials.buildRoleArn(
        Resource.Aws.account.id,
        Resource.Aws.tenant.roles.apiAccess.nameTemplate,
        useTenant().id,
      ),
      RoleSessionName: "ApiPapercutSync",
    })),
    async (c) => {
      const dispatchId = await Api.dispatchPapercutSync();

      return c.json({ dispatchId }, 202);
    },
  )
  .get(
    "/last-sync",
    authz("papercut-sync", "read"),
    userAuthzHeadersValidator,
    async (c) => {
      const metadata = await Tenants.readMetadata();
      if (!metadata) throw new HttpError.NotFound("Tenant metadata not found");
      const lastSyncedAt = metadata.lastPapercutSyncAt?.toISOString() ?? null;

      return c.json({ lastSyncedAt }, 200);
    },
  );
