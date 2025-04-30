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
import { authz } from "~/api/trpc/middleware/auth";
import { dynamoDbDocumentClient } from "~/api/trpc/middleware/aws";
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

      const currentUserOauth2Provider = await Auth.readOauth2ProviderById(
        currentUser.oauth2ProviderId,
      );
      if (!currentUserOauth2Provider)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Missing current user oauth2 provider",
        });

      const user = isSelf
        ? currentUser
        : await Users.read([input.userId]).then(R.first());
      if (!user)
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      const userOauth2Provider = isSelf
        ? currentUserOauth2Provider
        : await Auth.readOauth2ProviderById(user.oauth2ProviderId);
      if (!userOauth2Provider)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Missing user oauth2 provider",
        });

      switch (userOauth2Provider?.kind) {
        case Constants.ENTRA_ID:
          return withGraph(
            () =>
              Graph.Client.initWithMiddleware({
                authProvider: {
                  async getAccessToken() {
                    // If the current user was authenticated with entra id,
                    // then use the access token from the request header
                    if (currentUserOauth2Provider.kind === Constants.ENTRA_ID)
                      return ctx.req
                        .header("Authorization")!
                        .replace("Bearer ", "");

                    // Otherwise use the application access token
                    return EntraId.applicationAccessToken(
                      user.oauth2ProviderId,
                    );
                  },
                },
              }),
            async () => Graph.userPhotoBlob(user.oauth2UserId),
          );
        default:
          throw new TRPCError({ code: "NOT_IMPLEMENTED" });
      }
    }),
  countMonthlyActive: userProcedure
    .use(authz("monthly-active-users", "read"))
    .input(
      v.object({
        month: v.pipe(
          v.string(),
          v.regex(Constants.MONTH_TRUNCATED_ISO_DATE_REGEX),
        ),
      }),
    )
    .use(dynamoDbDocumentClient())
    .query(async ({ input }) => Users.countMonthlyActive(input.month)),
});

export type UsersRouterIO<TIO extends IO> = InferRouterIO<
  TIO,
  typeof usersRouter
>;
