import { createClient } from "@openauthjs/openauth/client";
import { withActor } from "@printworks/core/actors/context";
import { subjects } from "@printworks/core/auth/subjects";
import { bearerAuth } from "hono/bearer-auth";
import { every, some } from "hono/combine";
import { createMiddleware } from "hono/factory";

import type { UserSubject } from "@printworks/core/auth/subjects";

export const actor = createMiddleware(
  some(
    every(
      bearerAuth({
        async verifyToken(token, c) {
          const verified = await createClient({ clientID: "api" }).verify(
            subjects,
            token,
          );

          if (verified.err) {
            console.error("Token verification failed:", verified.err);
            return false;
          }
          if (verified.subject.type !== "user") {
            console.error("Invalid subject type:", verified.subject.type);
            return false;
          }

          c.set("subject", verified.subject);

          return true;
        },
      }),
      createMiddleware<{ Variables: { subject: UserSubject } }>((c, next) =>
        withActor(c.get("subject"), next),
      ),
    ),
    (_, next) => withActor({ type: "public", properties: {} }, next),
  ),
);
