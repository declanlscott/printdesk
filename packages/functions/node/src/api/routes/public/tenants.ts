import { vValidator } from "@hono/valibot-validator";
import { oauth2ProvidersTable } from "@printworks/core/auth/sql";
import { Api } from "@printworks/core/backend/api";
import { useTransaction } from "@printworks/core/drizzle/context";
import { Papercut } from "@printworks/core/papercut";
import { Tailscale } from "@printworks/core/tailscale";
import { Tenants } from "@printworks/core/tenants";
import { useTenant } from "@printworks/core/tenants/context";
import {
  registrationSchema,
  tenantSlugSchema,
} from "@printworks/core/tenants/shared";
import { tenantsTable } from "@printworks/core/tenants/sql";
import { Credentials } from "@printworks/core/utils/aws";
import { HttpError } from "@printworks/core/utils/errors";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import * as R from "remeda";
import { Resource } from "sst";
import * as v from "valibot";

import { executeApiSigner, sqsClient, ssmClient } from "~/api/middleware/aws";

const registrationParams = [
  "tailscaleOauthClientId",
  "tailscaleOauthClientSecret",
  "tailnetPapercutServerUri",
  "papercutServerAuthToken",
] as const;

export default new Hono()
  .post(
    "/",
    vValidator("json", v.omit(registrationSchema, registrationParams)),
    sqsClient(),
    async (c) => {
      const { tenantId, dispatchId } = await Tenants.register(
        c.req.valid("json"),
      );

      return c.json({ tenantId, dispatchId }, 202);
    },
  )
  .post(
    "/initial-sync",
    vValidator("json", v.pick(registrationSchema, registrationParams)),
    (c, next) =>
      ssmClient(() => ({
        RoleArn: Credentials.buildRoleArn(
          Resource.Aws.account.id,
          Resource.Aws.tenant.roles.putParameters.nameTemplate,
          useTenant().id,
        ),
        RoleSessionName: "ApiInitialSync",
      }))(c, next),
    (c, next) =>
      executeApiSigner(() => ({
        RoleArn: Credentials.buildRoleArn(
          Resource.Aws.account.id,
          Resource.Aws.tenant.roles.apiAccess.nameTemplate,
          useTenant().id,
        ),
        RoleSessionName: "ApiInitialSync",
      }))(c, next),
    async (c) => {
      await Promise.all([
        Tailscale.setOauthClient(
          c.req.valid("json").tailscaleOauthClientId,
          c.req.valid("json").tailscaleOauthClientSecret,
        ),
        Papercut.setTailnetServerUri(
          c.req.valid("json").tailnetPapercutServerUri,
        ),
        Papercut.setServerAuthToken(
          c.req.valid("json").papercutServerAuthToken,
        ),
      ]);

      const { eventId: dispatchId } = await Api.papercutSync();

      return c.json({ dispatchId }, 202);
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
    "/oauth-provider-types",
    vValidator("query", v.object({ slug: tenantSlugSchema })),
    async (c) => {
      const oauthProviderTypes = await useTransaction((tx) =>
        tx
          .select({ oauthProviderType: oauth2ProvidersTable.type })
          .from(tenantsTable)
          .innerJoin(
            oauth2ProvidersTable,
            eq(tenantsTable.id, oauth2ProvidersTable.tenantId),
          )
          .where(eq(tenantsTable.slug, c.req.valid("query").slug))
          .then(R.map(R.prop("oauthProviderType"))),
      );
      if (oauthProviderTypes.length === 0)
        throw new HttpError.NotFound("Tenant not found");

      return c.json({ oauthProviderTypes }, 200);
    },
  );
