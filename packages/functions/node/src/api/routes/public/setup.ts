import { vValidator } from "@hono/valibot-validator";
import { Api } from "@printworks/core/backend/api";
import { Tenants } from "@printworks/core/tenants";
import { useTenant } from "@printworks/core/tenants/context";
import {
  configureDataSchema,
  initializeDataSchema,
  registerDataSchema,
} from "@printworks/core/tenants/shared";
import { Credentials } from "@printworks/core/utils/aws";
import { Constants } from "@printworks/core/utils/constants";
import { Hono } from "hono";
import { Resource } from "sst";

import { authn } from "~/api/middleware/auth";
import { executeApiSigner, sqsClient, ssmClient } from "~/api/middleware/aws";
import { systemAuthzHeadersValidator } from "~/api/middleware/validators";

export default new Hono()
  .put("/initialize", vValidator("json", initializeDataSchema), async (c) => {
    const result = await Tenants.initialize(c.req.valid("json").licenseKey, {
      papercutSyncCronExpression:
        Constants.DEFAULT_PAPERCUT_SYNC_CRON_EXPRESSION,
      timezone: c.req.valid("json").timezone,
    });

    return c.json(result, 201);
  })
  .put(
    "/register",
    authn("system"),
    systemAuthzHeadersValidator,
    vValidator("json", registerDataSchema),
    async (c) => {
      await Tenants.register(c.req.valid("json"));

      return c.body(null, 201);
    },
  )
  .post(
    "/dispatch-infra",
    authn("system"),
    systemAuthzHeadersValidator,
    sqsClient(),
    async (c) => {
      const dispatchId = await Tenants.dispatchInfra();

      return c.json({ dispatchId }, 202);
    },
  )
  .put(
    "/configure",
    authn("system"),
    systemAuthzHeadersValidator,
    vValidator("json", configureDataSchema),
    ssmClient(() => ({
      RoleArn: Credentials.buildRoleArn(
        Resource.Aws.account.id,
        Resource.Aws.tenant.roles.putParameters.nameTemplate,
        useTenant().id,
      ),
      RoleSessionName: "ApiSetupConfigure",
    })),
    executeApiSigner(() => ({
      RoleArn: Credentials.buildRoleArn(
        Resource.Aws.account.id,
        Resource.Aws.tenant.roles.apiAccess.nameTemplate,
        useTenant().id,
      ),
      RoleSessionName: "ApiSetupConfigure",
    })),
    async (c) => {
      await Tenants.config(c.req.valid("json"));

      return c.body(null, 201);
    },
  )
  .post(
    "/dispatch-sync",
    authn("system"),
    systemAuthzHeadersValidator,
    executeApiSigner(() => ({
      RoleArn: Credentials.buildRoleArn(
        Resource.Aws.account.id,
        Resource.Aws.tenant.roles.apiAccess.nameTemplate,
        useTenant().id,
      ),
      RoleSessionName: "ApiSetupSync",
    })),
    async (c) => {
      const dispatchId = await Api.dispatchPapercutSync();

      return c.json({ dispatchId }, 202);
    },
  )
  .put("/activate", authn("system"), systemAuthzHeadersValidator, async (c) => {
    await Tenants.activate();

    return c.body(null, 204);
  });
