import { createClient } from "@openauthjs/openauth/client";
import { subjects } from "@printworks/core/auth/subjects";
import { HttpError } from "@printworks/core/utils/errors";
import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { getConnInfo } from "hono/cloudflare-workers";
import { every, some } from "hono/combine";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { Resource } from "sst";

import type { SubjectPayload } from "@openauthjs/openauth/subject";
import type { ContentfulStatusCode } from "hono/utils/http-status";

const rateLimiter = createMiddleware(
  every(
    some(
      every(
        bearerAuth({
          async verifyToken(token, c) {
            const verified = await createClient({
              clientID: "api-rate-limiter",
              issuer: Resource.Auth.url,
            }).verify(subjects, token);
            if (verified.err) {
              console.error("Token verification failed: ", verified.err);
              return false;
            }

            c.set("subject", verified.subject);
            return true;
          },
        }),
        async (c, next) => {
          const subject: SubjectPayload<typeof subjects> = c.get("subject");
          const key = `${subject.properties.tenantId}#${subject.properties.id}`;

          console.log("Rate limiting by user: ", key);
          c.set(
            "rateLimitOutcome",
            await c.env.API_RATE_LIMITERS.byUser({ key }),
          );

          return next();
        },
      ),
      async (c, next) => {
        const ip = getConnInfo(c).remote.address;
        if (!ip) throw new Error("Missing remote address");

        console.log("Rate limiting by IP: ", ip);
        c.set(
          "rateLimitOutcome",
          await c.env.API_RATE_LIMITERS.byIp({ key: ip }),
        );

        return next();
      },
    ),
    (c, next) => {
      const outcome: RateLimitOutcome = c.get("rateLimitOutcome");
      if (!outcome.success) throw new HttpError.TooManyRequests();

      return next();
    },
  ),
);

export default new Hono()
  .use(logger())
  .use(rateLimiter)
  .all("*", (c) => fetch(c.req.raw))
  .onError((e, c) => {
    console.error(e);

    if (e instanceof HttpError.Error)
      return c.json(e.message, e.statusCode as ContentfulStatusCode);
    if (e instanceof HTTPException) return e.getResponse();

    return c.json("Internal server error", 500);
  });
