import { useActor } from "@printworks/core/actors/context";
import { DynamoDb } from "@printworks/core/aws";
import { withAws } from "@printworks/core/aws/context";
import { Users } from "@printworks/core/users";
import { Constants } from "@printworks/core/utils/constants";
import { Hono } from "hono";
import { handle } from "hono/aws-lambda";
import { every, some } from "hono/combine";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";

import { actor } from "~/api/middleware/actor";
import { errorHandler } from "~/api/middleware/error";
import replicacheRoute from "~/api/routes/replicache";
import trpcRoute from "~/api/routes/trpc";

const app = new Hono()
  .use(logger())
  .use(errorHandler)
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

    return c.text("Internal server error", 500);
  });

export const handler = handle(app);
