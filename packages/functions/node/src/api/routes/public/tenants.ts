import { vValidator } from "@hono/valibot-validator";
import { Auth } from "@printworks/core/auth";
import { Tenants } from "@printworks/core/tenants";
import { useTenant } from "@printworks/core/tenants/context";
import {
  initializeDataSchema,
  registerDataSchema,
  tenantSlugSchema,
} from "@printworks/core/tenants/shared";
import { Credentials } from "@printworks/core/utils/aws";
import { HttpError } from "@printworks/core/utils/errors";
import { Hono } from "hono";
import * as R from "remeda";
import { Resource } from "sst";
import * as v from "valibot";

import { registrationAuthz } from "~/api/middleware/auth";
import { executeApiSigner, sqsClient, ssmClient } from "~/api/middleware/aws";
import { registrationHeaderValidator } from "~/api/middleware/validators";

export default new Hono()
  .post(
    "/register",
    vValidator("json", registerDataSchema),
    sqsClient(),
    async (c) => {
      const result = await Tenants.register(c.req.valid("json"));

      return c.json(result, 202);
    },
  )
  .post(
    "/initialize",
    registrationHeaderValidator,
    registrationAuthz("registered"),
    vValidator("json", initializeDataSchema),
    ssmClient(() => ({
      RoleArn: Credentials.buildRoleArn(
        Resource.Aws.account.id,
        Resource.Aws.tenant.roles.putParameters.nameTemplate,
        useTenant().id,
      ),
      RoleSessionName: "ApiTenantInitialization",
    })),
    executeApiSigner(() => ({
      RoleArn: Credentials.buildRoleArn(
        Resource.Aws.account.id,
        Resource.Aws.tenant.roles.apiAccess.nameTemplate,
        useTenant().id,
      ),
      RoleSessionName: "ApiTenantInitialization",
    })),
    async (c) => {
      const { dispatchId } = await Tenants.initialize(c.req.valid("json"));

      return c.json({ dispatchId }, 202);
    },
  )
  .put(
    "/activate",
    registrationHeaderValidator,
    registrationAuthz("initializing"),
    async (c) => {
      await Tenants.activate();

      return c.body(null, 204);
    },
  )
  .get(
    "/slug-availability/:value",
    vValidator("param", v.object({ value: tenantSlugSchema })),
    async (c) => {
      const isAvailable = await Tenants.isSlugAvailable(
        c.req.valid("param").value,
      );

      return c.json({ isAvailable }, 200);
    },
  )
  .get(
    "/license-key-availability/:value",
    vValidator(
      "param",
      v.object({ value: v.pipe(v.string(), v.trim(), v.uuid()) }),
    ),
    async (c) => {
      const isAvailable = await Tenants.isLicenseKeyAvailable(
        c.req.valid("param").value,
      );

      return c.json({ isAvailable }, 200);
    },
  )
  .get(
    "/oauth-providers",
    vValidator("query", v.object({ slug: tenantSlugSchema })),
    async (c) => {
      const providers = await Auth.readOauth2ProvidersBySlug(
        c.req.valid("query").slug,
      ).then(R.map(R.prop("type")));
      if (R.isEmpty(providers))
        throw new HttpError.NotFound("Tenant not found");

      return c.json({ providers }, 200);
    },
  );
