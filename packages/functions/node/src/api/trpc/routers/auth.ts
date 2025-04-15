import { Auth } from "@printworks/core/auth";
import { tenantSlugSchema } from "@printworks/core/tenants/shared";
import * as R from "remeda";
import * as v from "valibot";

import { t } from "~/api/trpc";
import { authz } from "~/api/trpc/middleware/auth";
import { userProcedure } from "~/api/trpc/procedures/protected";
import { publicProcedure } from "~/api/trpc/procedures/public";

export const authRouter = t.router({
  getOauthProviderKinds: publicProcedure
    .input(v.object({ slug: tenantSlugSchema }))
    .query(async ({ input }) =>
      Auth.readOauth2ProvidersBySlug(input.slug).then(R.map(R.prop("kind"))),
    ),
  getOauthProviders: userProcedure
    .meta({
      kind: "access-control",
      resource: "oauth-providers",
      action: "read",
    })
    .use(authz)
    .query(async () => Auth.readOauth2Providers()),
  createOauthProviderGroup: userProcedure
    .meta({
      kind: "access-control",
      resource: "oauth-providers",
      action: "create",
    })
    .use(authz)
    .input(v.object({ id: v.string(), oauth2ProviderId: v.string() }))
    .mutation(async ({ input }) => {
      await Auth.createOauth2ProviderUserGroup(
        input.id,
        input.oauth2ProviderId,
      );
    }),
  getOauthProviderGroups: userProcedure
    .meta({
      kind: "access-control",
      resource: "oauth-providers",
      action: "read",
    })
    .use(authz)
    .input(v.object({ oauth2ProviderId: v.string() }))
    .query(async ({ input }) =>
      Auth.readOauth2ProviderUserGroups(input.oauth2ProviderId),
    ),
  deleteOauthProviderGroup: userProcedure
    .meta({
      kind: "access-control",
      resource: "oauth-providers",
      action: "delete",
    })
    .use(authz)
    .input(v.object({ id: v.string(), oauth2ProviderId: v.string() }))
    .mutation(async ({ input }) => {
      await Auth.deleteOauth2ProviderUserGroup(
        input.id,
        input.oauth2ProviderId,
      );
    }),
});
