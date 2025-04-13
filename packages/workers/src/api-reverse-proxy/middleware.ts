/* eslint-disable drizzle/enforce-delete-with-where */
import { createFetchProxy } from "@mjackson/fetch-proxy";
import { createClient } from "@openauthjs/openauth/client";
import { subjects } from "@printworks/core/auth/subjects";
import { Constants } from "@printworks/core/utils/constants";
import { delimitToken } from "@printworks/core/utils/shared";
import { bearerAuth } from "hono/bearer-auth";
import { getConnInfo } from "hono/cloudflare-workers";
import { every, some } from "hono/combine";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { Resource } from "sst";

import type { FetchProxy } from "@mjackson/fetch-proxy";

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
            if (verified.subject.type !== Constants.SUBJECT_KINDS.USER) {
              console.error("Invalid subject type:", verified.subject.type);
              return false;
            }

            c.set("subject", verified.subject);

            return true;
          },
        }),
        createMiddleware<{
          Bindings: {
            [Constants.SERVICE_BINDING_NAMES.API_RATE_LIMITERS]: {
              byUser: RateLimit["limit"];
            };
          };
        }>(async (c, next) => {
          const key = delimitToken(
            c.var.subject.properties.tenantId,
            c.var.subject.properties.id,
          );

          console.log("Rate limiting by user:", key);
          c.set(
            "rateLimitOutcome",
            await c.env[
              Constants.SERVICE_BINDING_NAMES.API_RATE_LIMITERS
            ].byUser({ key }),
          );

          return next();
        }),
      ),
      createMiddleware<{
        Bindings: {
          [Constants.SERVICE_BINDING_NAMES.API_RATE_LIMITERS]: {
            byIp: RateLimit["limit"];
          };
        };
      }>(async (c, next) => {
        const ip = getConnInfo(c).remote.address;
        if (!ip) throw new Error("Missing remote address");

        console.log("Rate limiting by IP:", ip);
        c.set(
          "rateLimitOutcome",
          await c.env[Constants.SERVICE_BINDING_NAMES.API_RATE_LIMITERS].byIp({
            key: ip,
          }),
        );

        return next();
      }),
    ),
    createMiddleware((c, next) => {
      if (!c.var.rateLimitOutcome.success) throw new HTTPException(429);

      return next();
    }),
  ),
);

// https://datatracker.ietf.org/doc/html/rfc2616#section-13.5.1
const hopByHopHeaders = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
];

export const proxy = createMiddleware((c, next) => {
  const fetchProxy = createFetchProxy(Resource.Api.url);

  c.set("proxy", async (...args: Parameters<FetchProxy>) => {
    const res = await fetchProxy(...args);

    for (const header of hopByHopHeaders) res.headers.delete(header);
    if (res.headers.has("content-encoding")) {
      res.headers.delete("content-encoding");
      res.headers.delete("content-length");
    }

    return res;
  });

  return next();
});
