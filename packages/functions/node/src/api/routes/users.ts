import { vValidator } from "@hono/valibot-validator";
import { Auth } from "@printworks/core/auth";
import { EntraId } from "@printworks/core/auth/entra-id";
import { Users } from "@printworks/core/users";
import { useUser } from "@printworks/core/users/context";
import { Constants } from "@printworks/core/utils/constants";
import { HttpError } from "@printworks/core/utils/errors";
import { Graph, withGraph } from "@printworks/core/utils/graph";
import { nanoIdSchema } from "@printworks/core/utils/shared";
import { Hono } from "hono";
import * as R from "remeda";
import * as v from "valibot";

import { authz } from "~/api/middleware/auth";
import { dynamoDbDocumentClient } from "~/api/middleware/aws";
import { user } from "~/api/middleware/user";
import { userAuthzHeadersValidator } from "~/api/middleware/validators";

export default new Hono()
  .use(user)
  .get(
    "/:id/photo",
    userAuthzHeadersValidator,
    vValidator("param", v.object({ id: nanoIdSchema })),
    async (c) => {
      const userId = c.req.valid("param").id;

      const currentUser = useUser();
      const isSelf = userId === currentUser.id;

      const currentUserOauth2Provider = await Auth.readOauth2ProviderById(
        currentUser.oauth2ProviderId,
      );
      if (!currentUserOauth2Provider)
        throw new HttpError.InternalServerError(
          "Missing current user oauth2 provider",
        );

      const user = isSelf
        ? currentUser
        : await Users.read([userId]).then(R.first());
      if (!user) throw new HttpError.NotFound();

      const userOauth2Provider = isSelf
        ? currentUserOauth2Provider
        : await Auth.readOauth2ProviderById(user.oauth2ProviderId);
      if (!userOauth2Provider)
        throw new HttpError.NotFound("Missing user oauth2 provider");

      switch (userOauth2Provider?.kind) {
        case Constants.ENTRA_ID:
          return withGraph(
            Graph.Client.initWithMiddleware({
              authProvider: {
                async getAccessToken() {
                  // If the current user was authenticated with entra id,
                  // then use the access token from the request header
                  if (currentUserOauth2Provider.kind === Constants.ENTRA_ID)
                    return c.req
                      .header("Authorization")!
                      .replace("Bearer ", "");

                  // Otherwise use the application access token
                  return EntraId.applicationAccessToken(user.oauth2ProviderId);
                },
              },
            }),
            async () => {
              const res = await Graph.userPhotoResponse(user.oauth2UserId);
              res.headers.set("Cache-Control", "max-age=2592000");

              return res;
            },
          );
        default:
          throw new HttpError.NotImplemented();
      }
    },
  )
  .get(
    "/monthly-active",
    authz("monthly-active-users", "read"),
    userAuthzHeadersValidator,
    vValidator(
      "json",
      v.object({
        month: v.pipe(
          v.string(),
          v.regex(Constants.MONTH_TRUNCATED_ISO_DATE_REGEX),
        ),
      }),
    ),
    dynamoDbDocumentClient(),
    async (c) => {
      const result = await Users.countMonthlyActive(c.req.valid("json").month);

      return c.json(result, 200);
    },
  );
