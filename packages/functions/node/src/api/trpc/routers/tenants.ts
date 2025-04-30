import { Tenants } from "@printdesk/core/tenants";
import { tenantSlugSchema } from "@printdesk/core/tenants/shared";
import * as v from "valibot";

import { t } from "~/api/trpc";
import { publicProcedure } from "~/api/trpc/procedures/public";

import type { InferRouterIO, IO } from "~/api/trpc/types";

export const tenantsRouter = t.router({
  public: t.router({
    isSlugAvailable: publicProcedure
      .input(v.object({ slug: tenantSlugSchema }))
      .query(async ({ input }) => Tenants.isSlugAvailable(input.slug)),
    isLicenseKeyAvailable: publicProcedure
      .input(v.object({ licenseKey: v.pipe(v.string(), v.trim(), v.uuid()) }))
      .query(async ({ input }) =>
        Tenants.isLicenseKeyAvailable(input.licenseKey),
      ),
  }),
});

export type TenantsRouterIO<TIO extends IO> = InferRouterIO<
  TIO,
  typeof tenantsRouter
>;
