import { vValidator } from "@hono/valibot-validator";
import { useOauth2 } from "@printworks/core/oauth2/context";
import { EntraId } from "@printworks/core/oauth2/entra-id";
import { Google } from "@printworks/core/oauth2/google";
import { ENTRA_ID, GOOGLE } from "@printworks/core/oauth2/shared";
import { HttpError } from "@printworks/core/utils/errors";
import { nanoIdSchema } from "@printworks/core/utils/shared";
import { Hono } from "hono";
import * as v from "valibot";

import { authorization, provider } from "~/api/middleware";

export default new Hono()
  .use(authorization())
  .use(provider)
  .get(
    "/:id/photo",
    vValidator("param", v.object({ id: nanoIdSchema })),
    async (c) => {
      const userId = c.req.valid("param").id;
      const oauth2 = useOauth2();

      let res: Response;
      switch (oauth2.provider.variant) {
        case ENTRA_ID:
          res = await EntraId.photo(userId);
          break;
        case GOOGLE:
          res = await Google.photo(userId);
          break;
        default: {
          oauth2.provider.variant satisfies never;

          throw new HttpError.NotImplemented(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `Provider variant "${oauth2.provider.variant}" not implemented`,
          );
        }
      }

      const contentType = res.headers.get("Content-Type");

      return c.body(res.body, {
        status: res.status,
        headers: {
          ...(contentType ? { "Content-type": contentType } : undefined),
          "Cache-Control": "max-age=2592000",
        },
      });
    },
  );
