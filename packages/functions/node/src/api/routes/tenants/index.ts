import { vValidator } from "@hono/valibot-validator";
import { oauth2ProvidersTable } from "@printworks/core/auth/sql";
import { useTransaction } from "@printworks/core/drizzle/context";
import { registrationSchema } from "@printworks/core/tenants/shared";
import { licensesTable, tenantsTable } from "@printworks/core/tenants/sql";
import { and, eq, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import * as v from "valibot";

import { authzValidator } from "~/api/middleware/validators";

// TODO: Implement tenant registration

export default new Hono()
  .get(
    "/oauth-provider-type",
    vValidator(
      "query",
      v.object({ slug: v.pipe(v.string(), v.toLowerCase()) }),
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

      if (!tenant) return c.body(null, 404);

      return c.json({ oauthProviderType: tenant.oauthProviderType }, 200);
    },
  )
  .post(
    "/",
    authzValidator,
    vValidator("form", registrationSchema),
    async (c) => {
      // const registration = c.req.valid("form");
      // const tenant = await createTransaction(async (tx) => {
      //   const tenant = await tx
      //     .insert(tenantsTable)
      //     .values({
      //       slug: registration.tenantSlug,
      //       name: registration.tenantName,
      //       oauth2ProviderId: registration.oauth2ProviderId,
      //     })
      //     .returning()
      //     .then((rows) => rows.at(0));
      //   if (!tenant) throw new Error("Failed to create tenant");
      //   const { columns } = await tx
      //     .update(licensesTable)
      //     .set({ tenantId: tenant.id })
      //     .where(
      //       and(
      //         eq(licensesTable.key, registration.licenseKey),
      //         eq(licensesTable.status, "active"),
      //       ),
      //     );
      //   if (columns.length === 0)
      //     throw new Error("Invalid or expired license key");
      //   return tenant;
      // });
      // return c.redirect(`/tenant/${tenant.slug}`);
    },
  );
