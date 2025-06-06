import { Auth } from "@printdesk/core/auth";
import { EntraId } from "@printdesk/core/auth/entra-id";
import { identityProviderUserGroupsSchema } from "@printdesk/core/auth/shared";
import { Graph } from "@printdesk/core/graph";
import { withGraph } from "@printdesk/core/graph/context";
import { tenantSubdomainSchema } from "@printdesk/core/tenants/shared";
import { Constants } from "@printdesk/core/utils/constants";
import * as R from "remeda";
import * as v from "valibot";

import { t } from "~/api/trpc";
import { authz } from "~/api/trpc/middleware/auth";
import { userProcedure } from "~/api/trpc/procedures/protected";
import { publicProcedure } from "~/api/trpc/procedures/public";

import type { InferRouterIO, IO } from "~/api/trpc/types";

export const authRouter = t.router({
  public: t.router({
    getIdentityProviderKinds: publicProcedure
      .input(v.object({ subdomain: tenantSubdomainSchema }))
      .query(async ({ input }) =>
        Auth.readIdentityProvidersBySubdomain(input.subdomain).then(
          R.map(R.prop("kind")),
        ),
      ),
  }),
  getIdentityProviders: userProcedure
    .use(authz("identity-providers", "read"))
    .query(async () => Auth.readIdentityProviders()),
  createIdentityProviderUserGroup: userProcedure
    .use(authz("identity-providers", "create"))
    .input(
      v.pick(identityProviderUserGroupsSchema, ["id", "identityProviderId"]),
    )
    .mutation(async ({ input }) => {
      await Auth.createIdentityProviderUserGroup(
        input.id,
        input.identityProviderId,
      );
    }),
  getIdentityProviderUserGroups: userProcedure
    .use(authz("identity-providers", "read"))
    .input(v.pick(identityProviderUserGroupsSchema, ["identityProviderId"]))
    .query(async ({ input }) =>
      Auth.readIdentityProviderUserGroups(input.identityProviderId),
    ),
  deleteIdentityProviderUserGroup: userProcedure
    .use(authz("identity-providers", "delete"))
    .input(
      v.pick(identityProviderUserGroupsSchema, ["id", "identityProviderId"]),
    )
    .mutation(async ({ input }) => {
      await Auth.deleteIdentityProviderUserGroup(
        input.id,
        input.identityProviderId,
      );
    }),
  [Constants.ENTRA_ID]: t.router({
    getUserGroups: userProcedure
      .use(authz("identity-providers", "read"))
      .input(v.pick(identityProviderUserGroupsSchema, ["identityProviderId"]))
      .use(async (opts) =>
        withGraph(
          () =>
            Graph.Client.initWithMiddleware({
              authProvider: {
                getAccessToken: async () =>
                  EntraId.applicationAccessToken(opts.input.identityProviderId),
              },
            }),
          () => opts.next(opts),
        ),
      )
      .query(async () => Graph.groups()),
  }),
  [Constants.GOOGLE]: t.router({
    // TODO
  }),
});

export type AuthRouterIO<TIO extends IO> = InferRouterIO<
  TIO,
  typeof authRouter
>;
