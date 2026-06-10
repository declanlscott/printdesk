import { Oauth } from "@printdesk/core/oauth/client";
import { OauthContract } from "@printdesk/core/oauth/contract";
import { Constants } from "@printdesk/core/utils/constants";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import { setCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";

import { openauthRuntime } from "../lib/auth";

import type { CookieOptions } from "hono/utils/cookie";

const cookieOptions = {
  httpOnly: true,
  maxAge: 31_449_600, // 52 weeks
  path: "/",
  sameSite: "lax",
  secure: true,
} satisfies CookieOptions;

export const subject = createMiddleware((c, next) =>
  OauthContract.Cookies.pipe(
    HttpServerRequest.schemaCookies,
    Effect.provideService(
      HttpServerRequest.HttpServerRequest,
      HttpServerRequest.fromWeb(c.req.raw),
    ),
    Effect.tapError(Effect.log),
    Effect.runPromiseExit,
  ).then(
    Exit.match({
      onSuccess: async function (tokens) {
        if (!("accessToken" in tokens)) return next();

        await Oauth.Openauth.use((openauth) =>
          openauth.verify(tokens.accessToken, { refresh: tokens.refreshToken }),
        )
          .pipe(openauthRuntime.runPromiseExit)
          .then(
            Exit.match({
              onSuccess: (result) => {
                c.set("subject", result.subject.properties);

                if (Option.isSome(result.tokens)) {
                  setCookie(
                    c,
                    Constants.COOKIE_NAMES.ACCESS_TOKEN,
                    result.tokens.value.access.pipe(Redacted.value),
                    cookieOptions,
                  );
                  setCookie(
                    c,
                    Constants.COOKIE_NAMES.REFRESH_TOKEN,
                    result.tokens.value.refresh.pipe(Redacted.value),
                    cookieOptions,
                  );
                }

                return next();
              },
              onFailure: next,
            }),
          );
      },
      onFailure: next,
    }),
  ),
);
