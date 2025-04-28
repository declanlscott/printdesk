import { Auth } from "@printdesk/core/auth";
import { EntraId } from "@printdesk/core/auth/entra-id";
import { oauth2ProviderUserGroupsSchema } from "@printdesk/core/auth/shared";
import { Graph } from "@printdesk/core/graph";
import { withGraph } from "@printdesk/core/graph/context";
import { tenantSlugSchema } from "@printdesk/core/tenants/shared";
import * as R from "remeda";
import * as v from "valibot";

import { t } from "~/api/trpc";
import { authz } from "~/api/trpc/middleware/auth";
import { userProcedure } from "~/api/trpc/procedures/protected";
import { publicProcedure } from "~/api/trpc/procedures/public";

import type { InferRouterIO, IO } from "~/api/trpc/types";

export const authRouter = t.router({
  getOauthProviderKinds: publicProcedure
    .input(v.object({ slug: tenantSlugSchema }))
    .query(async ({ input }) =>
      Auth.readOauth2ProvidersBySlug(input.slug).then(R.map(R.prop("kind"))),
    ),
  getOauthProviders: userProcedure
    .use(authz("oauth-providers", "read"))
    .query(async () => Auth.readOauth2Providers()),
  createOauthProviderGroup: userProcedure
    .use(authz("oauth-providers", "create"))
    .input(v.pick(oauth2ProviderUserGroupsSchema, ["id", "oauth2ProviderId"]))
    .mutation(async ({ input }) => {
      await Auth.createOauth2ProviderUserGroup(
        input.id,
        input.oauth2ProviderId,
      );
    }),
  getOauthProviderGroups: userProcedure
    .use(authz("oauth-providers", "read"))
    .input(v.pick(oauth2ProviderUserGroupsSchema, ["oauth2ProviderId"]))
    .query(async ({ input }) =>
      Auth.readOauth2ProviderUserGroups(input.oauth2ProviderId),
    ),
  deleteOauthProviderGroup: userProcedure
    .use(authz("oauth-providers", "delete"))
    .input(v.pick(oauth2ProviderUserGroupsSchema, ["id", "oauth2ProviderId"]))
    .mutation(async ({ input }) => {
      await Auth.deleteOauth2ProviderUserGroup(
        input.id,
        input.oauth2ProviderId,
      );
    }),
  entraId: t.router({
    getGroups: userProcedure
      .use(authz("oauth-providers", "read"))
      .input(v.pick(oauth2ProviderUserGroupsSchema, ["oauth2ProviderId"]))
      .use(async (opts) =>
        withGraph(
          () =>
            Graph.Client.initWithMiddleware({
              authProvider: {
                getAccessToken: async () =>
                  EntraId.applicationAccessToken(opts.input.oauth2ProviderId),
              },
            }),
          () => opts.next(opts),
        ),
      )
      .query(async () => Graph.groups()),
  }),
  google: t.router({
    // TODO
  }),
});

export type AuthRouterIO<TIO extends IO> = InferRouterIO<
  TIO,
  typeof authRouter
>;
