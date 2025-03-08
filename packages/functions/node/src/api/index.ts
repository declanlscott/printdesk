import { Constants } from "@printworks/core/utils/constants";
import { HttpError } from "@printworks/core/utils/errors";
import { Hono } from "hono";
import { handle } from "hono/aws-lambda";
import { except } from "hono/combine";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";

import { actor } from "~/api/middleware/actor";
import { authn } from "~/api/middleware/auth";
import filesRoute from "~/api/routes/files";
import publicRoute from "~/api/routes/public";
import realtimeRoute from "~/api/routes/realtime";
import replicacheRoute from "~/api/routes/replicache";
import servicesRoute from "~/api/routes/services";
import usersRoute from "~/api/routes/users";

import type { ContentfulStatusCode } from "hono/utils/http-status";

const app = new Hono()
  .use(logger())
  .use(actor)
  .use(except("/public/*", authn(Constants.ACTOR_TYPES.USER)))
  .route("/files", filesRoute)
  .route("/public", publicRoute)
  .route("/realtime", realtimeRoute)
  .route("/replicache", replicacheRoute)
  .route("/services", servicesRoute)
  .route("/users", usersRoute)
  .onError((e, c) => {
    console.error(e);

    if (e instanceof HttpError.Error)
      return c.text(e.message, e.statusCode as ContentfulStatusCode);
    if (e instanceof HTTPException) return e.getResponse();

    return c.text("Internal server error", 500);
  });

export const handler = handle(app);

export type Api = typeof app;
