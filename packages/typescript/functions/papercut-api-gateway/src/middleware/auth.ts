import { AccessControl } from "@printdesk/core/access-control";
import { ActorLayerMap } from "@printdesk/core/actors";
import { Oauth } from "@printdesk/core/oauth/client";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Match from "effect/match";
import * as Result from "effect/Result";
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import * as HttpServerRespondable from "effect/unstable/http/HttpServerRespondable";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import { AuthHeaders, authRuntime } from "../lib/auth";

import type { ContentfulStatusCode } from "hono/utils/http-status";

export const auth = createMiddleware((c, next) =>
  AuthHeaders.pipe(
    (headers) =>
      HttpApiError.HttpApiSchemaError.wrap("Headers", HttpServerRequest.schemaHeaders(headers)),
    Effect.provideService(
      HttpServerRequest.HttpServerRequest,
      HttpServerRequest.fromWeb(c.req.raw),
    ),
    Effect.flatMap(({ accessToken }) =>
      Oauth.Openauth.use((openauth) => openauth.verify(accessToken)),
    ),
    Effect.flatMap(({ subject }) =>
      AccessControl.clientPermissionPolicy("papercut_api_gateway:read").pipe(
        Effect.provide(ActorLayerMap.get(subject.properties.actor.wrap)),
      ),
    ),
    authRuntime.runPromiseExit,
  ).then(
    Exit.match({
      onSuccess: next,
      onFailure: (cause) =>
        cause.pipe(
          Cause.findError,
          Result.match({
            onSuccess: (error) => {
              throw error.pipe(
                HttpServerRespondable.toResponse,
                Effect.map(HttpServerResponse.toWeb),
                Effect.map(
                  (res) =>
                    new HTTPException(
                      Match.value(res.status).pipe(
                        Match.when(Match.is(401), () => 407),
                        Match.orElse((status) => status),
                      ) as ContentfulStatusCode,
                      { res, cause: error.cause },
                    ),
                ),
                Effect.runSync,
              );
            },
            onFailure: (cause) => {
              throw new HTTPException(500, { cause });
            },
          }),
        ),
    }),
  ),
);
