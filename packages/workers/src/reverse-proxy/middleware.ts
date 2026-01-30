import { createFetchProxy } from "@mjackson/fetch-proxy";
import { AuthContract } from "@printdesk/core/auth/contracts";
import { Oauth } from "@printdesk/core/auth/oauth";
import { separatedString } from "@printdesk/core/utils";
import { Constants } from "@printdesk/core/utils/constants";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import { bearerAuth } from "hono/bearer-auth";
import { getConnInfo } from "hono/cloudflare-workers";
import { every, some } from "hono/combine";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import type { FetchProxy } from "@mjackson/fetch-proxy";
import type { Bindings } from "./types";

const oauthRuntime = Oauth.Client.runtime({
  clientID: Constants.OPENAUTH_CLIENT_IDS.REVERSE_PROXY,
});

const encodeKey = separatedString().pipe(Schema.encodeSync);

export const rateLimiter = createMiddleware(
  every(
    some(
      every(
        bearerAuth({
          verifyToken: (token, c) =>
            Redacted.make(token).pipe(
              Oauth.Client.verify,
              Effect.map(({ subject }) => {
                if (subject.type !== AuthContract.UserSubject._tag) {
                  console.error("Invalid subject type:", subject.type);
                  return false;
                }

                c.set("subject", subject);

                return true;
              }),
              Effect.catchAll(() => Effect.succeed(false)),
              oauthRuntime.runPromise,
            ),
        }),
        createMiddleware<{
          Bindings: Bindings;
        }>(async (c, next) => {
          const key = encodeKey([
            "tenant",
            c.var.subject.properties.tenantId,
            c.var.subject.type,
            c.var.subject.properties.id,
          ]);

          console.log("Rate limiting by subject:", key);
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

        const key = encodeKey(["ip", ip]);

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
