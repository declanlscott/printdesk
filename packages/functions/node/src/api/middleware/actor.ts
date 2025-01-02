import { createClient } from "@openauthjs/openauth/client";
import { withActor } from "@printworks/core/actors/context";
import { subjects } from "@printworks/core/auth/shared";
import { createMiddleware } from "hono/factory";

export const actor = createMiddleware(async (c, next) => {
  const accessToken = c.req.header("Authorization")?.replace("Bearer ", "");

  if (accessToken) {
    const verified = await createClient({ clientID: "api" }).verify(
      subjects,
      accessToken,
    );

    if (!verified.err)
      return withActor(
        { type: "user", properties: verified.subject.properties },
        next,
      );
  }

  return withActor({ type: "public", properties: {} }, next);
});
