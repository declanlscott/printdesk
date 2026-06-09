import { AccessControl } from "@printdesk/core/access-control";
import { ActorLayerMap } from "@printdesk/core/actors";
import { Oauth } from "@printdesk/core/oauth/client";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Redacted from "effect/Redacted";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import { authRuntime } from "../lib/auth";

const accessTokenRegex = new RegExp(/^[A-Za-z0-9._~+/-]+=*/);

export const auth = createMiddleware(async function (c, next) {
  const headerToken = c.req.header("Proxy-Authorization");
  if (!headerToken) throw new HTTPException(407);

  const accessToken = headerToken.slice("Bearer ".length);
  if (!accessTokenRegex.test(accessToken)) throw new HTTPException(407);

  const verifyExit = await Oauth.Openauth.use((openauth) =>
    Redacted.make(accessToken).pipe(openauth.verify),
  ).pipe(authRuntime.runPromiseExit);

  if (Exit.isFailure(verifyExit)) throw new HTTPException(407);

  const accessExit = AccessControl.clientPermissionPolicy("papercut_api_gateway:read").pipe(
    Effect.provide(ActorLayerMap.get(verifyExit.value.subject.properties.actor.wrap)),
    authRuntime.runSyncExit,
  );
  if (Exit.isFailure(accessExit)) throw new HTTPException(403);

  return next();
});
