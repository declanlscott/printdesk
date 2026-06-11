import { Oauth } from "@printdesk/core/oauth/client";
import { OauthContract } from "@printdesk/core/oauth/contract";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import { createMiddleware } from "hono/factory";

import { openauthRuntime } from "../lib/auth";

export const subject = createMiddleware((c, next) =>
  OauthContract.Cookies.pipe(
    HttpServerRequest.schemaCookies,
    Effect.provideService(
      HttpServerRequest.HttpServerRequest,
      HttpServerRequest.fromWeb(c.req.raw),
    ),
    Effect.flatMap((cookies) =>
      "accessToken" in cookies
        ? Oauth.Openauth.use((openauth) => openauth.verify(cookies.accessToken)).pipe(
            Effect.map(Option.some),
          )
        : Effect.succeedNone,
    ),
    Effect.tapCause(Effect.logError),
    openauthRuntime.runPromiseExit,
  ).then(
    Exit.match({
      onSuccess: (verified) => {
        if (Option.isSome(verified)) c.set("subject", verified.value.subject.properties);

        return next();
      },
      onFailure: next,
    }),
  ),
);
