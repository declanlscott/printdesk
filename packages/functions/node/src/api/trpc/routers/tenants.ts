import { Auth } from "@printworks/core/auth";
import { Tenants } from "@printworks/core/tenants";
import { tenantSlugSchema } from "@printworks/core/tenants/shared";
import * as R from "remeda";
import * as v from "valibot";

import { t } from "~/api/trpc";
import { publicProcedure } from "~/api/trpc/procedures/public";

export const tenantsRouter = t.router({
  isSlugAvailable: publicProcedure
    .input(v.object({ value: tenantSlugSchema }))
    .query(async ({ input }) => Tenants.isSlugAvailable(input.value)),
  isLicenseKeyAvailable: publicProcedure
    .input(v.object({ value: v.pipe(v.string(), v.trim(), v.uuid()) }))
    .query(async ({ input }) => Tenants.isLicenseKeyAvailable(input.value)),
  getOauthProviders: publicProcedure
    .input(v.object({ slug: tenantSlugSchema }))
    .query(async ({ input }) =>
      Auth.readOauth2ProvidersBySlug(input.slug).then(R.map(R.prop("kind"))),
    ),
});
