import { createFetchProxy } from "@mjackson/fetch-proxy";
import { createClient } from "@openauthjs/openauth/client";
import { AuthContract } from "@printdesk/core/auth/contract";
import { delimitToken } from "@printdesk/core/utils";
import { Constants } from "@printdesk/core/utils/constants";
import { bearerAuth } from "hono/bearer-auth";
import { getConnInfo } from "hono/cloudflare-workers";
import { every, some } from "hono/combine";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import type { FetchProxy } from "@mjackson/fetch-proxy";
import type { Bindings } from "./types";

export const rateLimiter = createMiddleware(
  every(
    some(
      every(
        bearerAuth({
          async verifyToken(token, c) {
            const verified = await createClient({
              clientID: Constants.OPENAUTH_CLIENT_IDS.REVERSE_PROXY,
            }).verify(AuthContract.subjects, token);

            if (verified.err) {
              console.error("Token verification failed:", verified.err);
              return false;
            }
            if (verified.subject.type !== AuthContract.UserSubject._tag) {
              console.error("Invalid subject type:", verified.subject.type);
              return false;
            }

            c.set("subject", verified.subject.properties);

            return true;
          },
        }),
        createMiddleware<{
          Bindings: Bindings;
        }>(async (c, next) => {
          const key = delimitToken(
            "tenant",
            c.var.subject.tenantId,
            "user",
            c.var.subject.id,
          );

          console.log("Rate limiting by user:", key);
          c.set(
            "rateLimitOutcome",
            await c.env[Constants.CLOUDFLARE_BINDING_NAMES.RATE_LIMITER].limit({
              key,
            }),
          );

          return next();
        }),
      ),
      createMiddleware<{
        Bindings: Bindings;
      }>(async (c, next) => {
        const ip = getConnInfo(c).remote.address;
        if (!ip) throw new Error("Missing remote address");

        const key = delimitToken("ip", ip);

        console.log("Rate limiting by IP:", key);
        c.set(
          "rateLimitOutcome",
          await c.env[Constants.CLOUDFLARE_BINDING_NAMES.RATE_LIMITER].limit({
            key,
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
  const fetchProxy = createFetchProxy(`https://${new URL(c.req.url).host}`);

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
