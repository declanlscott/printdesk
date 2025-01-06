import { vValidator } from "@hono/valibot-validator";
import { oauth2ProvidersTable } from "@printworks/core/auth/sql";
import { useTransaction } from "@printworks/core/drizzle/context";
import { Tenants } from "@printworks/core/tenants";
import { tenantSlugSchema } from "@printworks/core/tenants/shared";
import { tenantsTable } from "@printworks/core/tenants/sql";
import { HttpError } from "@printworks/core/utils/errors";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import * as R from "remeda";
import * as v from "valibot";

// TODO: Implement tenant registration

export default new Hono()
  .get(
    "/slug-availability/:value",
    vValidator("param", v.object({ slug: tenantSlugSchema })),
    async (c) => {
      const isAvailable = await Tenants.isSlugAvailable(
        c.req.param("value").trim().toLowerCase(),
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
