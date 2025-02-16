import { createFetchProxy } from "@mjackson/fetch-proxy";
import { createClient } from "@openauthjs/openauth/client";
import { subjects } from "@printworks/core/auth/subjects";
import { HttpError } from "@printworks/core/utils/errors";
import { bearerAuth } from "hono/bearer-auth";
import { getConnInfo } from "hono/cloudflare-workers";
import { every, some } from "hono/combine";
import { createMiddleware } from "hono/factory";
import { Resource } from "sst";

export const rateLimiter = createMiddleware(
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
        createMiddleware<{
          Bindings: {
            API_RATE_LIMITERS: {
              byUser: RateLimit["limit"];
            };
          };
        }>(async (c, next) => {
          const { tenantId, id: userId } = c.get("subject").properties;
          const key = `${tenantId}#${userId}`;

          console.log("Rate limiting by user:", key);
          c.set(
            "rateLimitOutcome",
            await c.env.API_RATE_LIMITERS.byUser({ key }),
          );

          return next();
        }),
      ),
      createMiddleware<{
        Bindings: {
          API_RATE_LIMITERS: {
            byIp: RateLimit["limit"];
          };
        };
      }>(async (c, next) => {
        const ip = getConnInfo(c).remote.address;
        if (!ip) throw new Error("Missing remote address");

        console.log("Rate limiting by IP:", ip);
        c.set(
          "rateLimitOutcome",
          await c.env.API_RATE_LIMITERS.byIp({ key: ip }),
        );

        return next();
      }),
    ),
    createMiddleware((c, next) => {
      const outcome = c.get("rateLimitOutcome");
      if (!outcome.success) throw new HttpError.TooManyRequests();

      return next();
    }),
  ),
);

export const proxy = createMiddleware((c, next) => {
  c.set("proxy", createFetchProxy(Resource.Api.url));

  return next();
});
