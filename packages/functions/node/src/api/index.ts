import { ServerErrors } from "@printdesk/core/errors";
import { SharedErrors } from "@printdesk/core/errors/shared";
import { Middleware } from "@printdesk/core/hono";
import { Hono } from "hono";
import { handle } from "hono/aws-lambda";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { Resource } from "sst";

import { actor } from "~/api/middleware/actor";
import replicacheRoute from "~/api/routes/replicache";
import trpcRoute from "~/api/routes/trpc";

import type {
  ClientStateNotFoundResponse,
  VersionNotSupportedResponse,
} from "@rocicorp/replicache";

const app = new Hono()
  .use(logger())
  .use(Middleware.sourceValidator(Resource.Domains.api))
  .use(actor)
  .route("/replicache", replicacheRoute)
  .route("/trpc", trpcRoute)
  .onError((e, c) => {
    console.error(e);

    if (e instanceof HTTPException) return e.getResponse();

    if (e instanceof ServerErrors.BadRequest)
      return c.newResponse(e.message, 400);
    if (
      e instanceof SharedErrors.AccessDenied ||
      e instanceof ServerErrors.InvalidActor
    )
      return c.newResponse(e.message, 403);
    if (e instanceof SharedErrors.NotFound)
      return c.newResponse(e.message, 404);
    if (e instanceof ServerErrors.MutationConflict)
      return c.newResponse(e.message, 409);
    if (e instanceof ServerErrors.ReplicacheClientStateNotFound)
      return c.json(
        { error: "ClientStateNotFound" } satisfies ClientStateNotFoundResponse,
        200,
      );
    if (e instanceof ServerErrors.ReplicacheVersionNotSupported)
      return c.json(
        {
          error: "VersionNotSupported",
          versionType: e.versionType,
        } satisfies VersionNotSupportedResponse,
        200,
      );

    return c.newResponse(e.message, 500);
  });

export const handler = handle(app);
