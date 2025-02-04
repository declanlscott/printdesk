import { vValidator } from "@hono/valibot-validator";
import { oauth2ProvidersTable } from "@printworks/core/auth/sql";
import { useTransaction } from "@printworks/core/drizzle/context";
import { Tenants } from "@printworks/core/tenants";
import { Api } from "@printworks/core/tenants/api";
import {
  licenseKeySchema,
  registrationSchema,
  tenantSlugSchema,
} from "@printworks/core/tenants/shared";
import { licensesTable, tenantsTable } from "@printworks/core/tenants/sql";
import { HttpError } from "@printworks/core/utils/errors";
import { nanoIdSchema } from "@printworks/core/utils/shared";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import * as R from "remeda";
import * as v from "valibot";

import { sqsClient } from "~/api/middleware/aws";

export default new Hono()
  .post(
    "/",
    vValidator(
      "json",
      v.omit(registrationSchema, [
        "tailscaleOauthClientId",
        "tailscaleOauthClientSecret",
        "tailnetPapercutServerUri",
        "papercutServerAuthToken",
      ]),
    ),
    sqsClient(),
    async (c) => {
      const { tenantId, dispatchId } = await Tenants.register(
        c.req.valid("json"),
      );

      return c.json({ tenantId, dispatchId }, 201);
    },
  )
  .post(
    "/initial-sync",
    vValidator(
      "json",
      v.object({ licenseKey: licenseKeySchema, tenantId: nanoIdSchema }),
    ),
    async (c, next) => {
      const { licenseKey, tenantId } = c.req.valid("json");

      const isAuthorized = await useTransaction((tx) =>
        tx
          .select({})
          .from(licensesTable)
          .innerJoin(tenantsTable, eq(licensesTable.tenantId, tenantsTable.id))
          .where(
            and(
              eq(licensesTable.key, licenseKey),
              eq(licensesTable.tenantId, tenantId),
              eq(licensesTable.status, "active"),
              eq(tenantsTable.status, "initializing"),
            ),
          )
          .then((rows) => rows.length === 1),
      );

      if (!isAuthorized) throw new HttpError.Forbidden();

      await next();
    },
    async (c) => {
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
