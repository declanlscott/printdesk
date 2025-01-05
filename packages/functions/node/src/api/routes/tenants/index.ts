import { vValidator } from "@hono/valibot-validator";
import { oauth2ProvidersTable } from "@printworks/core/auth/sql";
import { useTransaction } from "@printworks/core/drizzle/context";
import { tenantsTable } from "@printworks/core/tenants/sql";
import { HttpError } from "@printworks/core/utils/errors";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import * as v from "valibot";

// TODO: Implement tenant registration

export default new Hono().get(
  "/oauth-provider-type",
  vValidator(
    "query",
    v.object({ slug: v.pipe(v.string(), v.trim(), v.toLowerCase()) }),
  ),
  async (c) => {
    const tenant = await useTransaction((tx) =>
      tx
        .select({ oauthProviderType: oauth2ProvidersTable.type })
        .from(tenantsTable)
        .where(eq(tenantsTable.slug, c.req.valid("query").slug))
        .innerJoin(
          oauth2ProvidersTable,
          and(
            eq(tenantsTable.oauth2ProviderId, oauth2ProvidersTable.id),
            eq(tenantsTable.id, oauth2ProvidersTable.tenantId),
          ),
        )
        .then((rows) => rows.at(0)),
    );

    if (!tenant) throw new HttpError.NotFound("tenant not found");

    return c.json({ oauthProviderType: tenant.oauthProviderType }, 200);
  },
);
