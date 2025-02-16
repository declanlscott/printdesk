import { vValidator } from "@hono/valibot-validator";
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

import { user } from "~/api/middleware/user";

export default new Hono().get(
  "/:id/photo",
  vValidator("param", v.object({ id: nanoIdSchema })),
  user,
  async (c) => {
    const userId = c.req.valid("param").id;

    const currentUser = useUser();
    const isSelf = userId === currentUser.id;

    const user = isSelf
      ? currentUser
      : await Users.read([userId]).then(R.first());
    if (!user) throw new HttpError.NotFound();

    switch (user.oauth2Provider.type) {
      case Constants.ENTRA_ID:
        return withGraph(
          Graph.Client.initWithMiddleware({
            authProvider: {
              async getAccessToken() {
                // If the current user was authenticated with entra id,
                // then use the access token from the request header
                if (currentUser.oauth2Provider.type === Constants.ENTRA_ID)
                  return c.req.header("Authorization")!.replace("Bearer ", "");

                // Otherwise use the application access token
                return EntraId.applicationAccessToken(user.oauth2Provider.id);
              },
            },
          }),
          async () => {
            const res = await Graph.photoResponse(user.profile.oauth2UserId);
            res.headers.set("Cache-Control", "max-age=2592000");

            return res;
          },
        );
      default:
        throw new HttpError.NotImplemented();
    }
  },
);
