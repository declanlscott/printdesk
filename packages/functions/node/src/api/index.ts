import { useActor } from "@printdesk/core/actors/context";
import { DynamoDb } from "@printdesk/core/aws";
import { withAws } from "@printdesk/core/aws/context";
import { ServerErrors } from "@printdesk/core/errors";
import { SharedErrors } from "@printdesk/core/errors/shared";
import { Users } from "@printdesk/core/users";
import { Constants } from "@printdesk/core/utils/constants";
import { Hono } from "hono";
import { handle } from "hono/aws-lambda";
import { every, some } from "hono/combine";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";

import { actor } from "~/api/middleware/actor";
import replicacheRoute from "~/api/routes/replicache";
import trpcRoute from "~/api/routes/trpc";

import type {
  ClientStateNotFoundResponse,
  VersionNotSupportedResponse,
} from "replicache";

const app = new Hono()
  .use(logger())
  .use(actor)
  .use(
    some(
      () => useActor().kind !== Constants.ACTOR_KINDS.USER,
      every(
        async (_, next) =>
          withAws(
            () => ({
              dynamoDb: {
                documentClient: DynamoDb.DocumentClient.from(
                  new DynamoDb.Client(),
                ),
              },
            }),
            next,
          ),
        async (_, next) => {
          await Users.recordActivity();

          return next();
        },
      ),
    ),
  )
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
