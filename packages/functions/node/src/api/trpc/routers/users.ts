import { Auth } from "@printdesk/core/auth";
import { EntraId } from "@printdesk/core/auth/entra-id";
import { Graph } from "@printdesk/core/graph";
import { withGraph } from "@printdesk/core/graph/context";
import { Users } from "@printdesk/core/users";
import { useUser } from "@printdesk/core/users/context";
import { Constants } from "@printdesk/core/utils/constants";
import { nanoIdSchema } from "@printdesk/core/utils/shared";
import { TRPCError } from "@trpc/server";
import * as R from "remeda";
import * as v from "valibot";

import { t } from "~/api/trpc";
import { user } from "~/api/trpc/middleware/user";
import { userProcedure } from "~/api/trpc/procedures/protected";

import type { InferRouterIO, IO } from "~/api/trpc/types";

export const usersRouter = t.router({
  getPhotoBlob: userProcedure
    .input(v.object({ userId: nanoIdSchema }))
    .use(user)
    .query(async ({ ctx, input }) => {
      const currentUser = useUser();
      const isSelf = input.userId === currentUser.id;

      const currentUserIdentityProvider = await Auth.readIdentityProviderById(
        currentUser.identityProviderId,
      );
      if (!currentUserIdentityProvider)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Missing current user's identity provider",
        });

      const user = isSelf
        ? currentUser
        : await Users.read([input.userId]).then(R.first());
      if (!user)
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      const identityProvider = isSelf
        ? currentUserIdentityProvider
        : await Auth.readIdentityProviderById(user.identityProviderId);
      if (!identityProvider)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Missing identity provider",
        });

      switch (identityProvider.kind) {
        case Constants.ENTRA_ID:
          return withGraph(
            () =>
              Graph.Client.initWithMiddleware({
                authProvider: {
                  async getAccessToken() {
                    // If the current user was authenticated with entra id,
                    // then use the access token from the request header
                    if (currentUserIdentityProvider.kind === Constants.ENTRA_ID)
                      return ctx.req
                        .header("Authorization")!
                        .replace("Bearer ", "");

                    // Otherwise use the application access token
                    return EntraId.applicationAccessToken(
                      user.identityProviderId,
                    );
                  },
                },
              }),
            async () => Graph.userPhotoBlob(user.subjectId),
          );
        default:
          throw new TRPCError({ code: "NOT_IMPLEMENTED" });
      }
    }),
});

export type UsersRouterIO<TIO extends IO> = InferRouterIO<
  TIO,
  typeof usersRouter
>;
