import { Constants } from "@printworks/core/utils/constants";
import { HttpError } from "@printworks/core/utils/errors";
import { Hono } from "hono";
import { handle } from "hono/aws-lambda";
import { except } from "hono/combine";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";

import { actor } from "~/api/middleware/actor";
import { authn } from "~/api/middleware/auth";
import { dynamoDbDocumentClient } from "~/api/middleware/aws";
import { activity } from "~/api/middleware/user";
import replicacheRoute from "~/api/routes/replicache";
import trpcRoute from "~/api/routes/trpc";

import type { ContentfulStatusCode } from "hono/utils/http-status";

const app = new Hono()
  .use(logger())
  .use(actor)
  .use(
    except(
      "/public/*",
      authn(Constants.ACTOR_KINDS.USER),
      dynamoDbDocumentClient(),
      activity,
    ),
  )
  .route("/replicache", replicacheRoute)
  .route("/trpc", trpcRoute)
  .onError((e, c) => {
    console.error(e);

    if (e instanceof HttpError.Error)
      return c.text(e.message, e.statusCode as ContentfulStatusCode);
    if (e instanceof HTTPException) return e.getResponse();

    return c.text("Internal server error", 500);
  });

export const handler = handle(app);

export type Api = typeof app;
