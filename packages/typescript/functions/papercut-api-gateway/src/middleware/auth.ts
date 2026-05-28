import { AccessControl } from "@printdesk/core/access-control";
import { Actor } from "@printdesk/core/actors";
import { ActorsContract } from "@printdesk/core/actors/contract";
import { Oauth } from "@printdesk/core/oauth/client";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Redacted from "effect/Redacted";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import { openauthRuntime } from "../lib/auth";

const accessTokenRegex = new RegExp(/^[A-Za-z0-9._~+/-]+=*/);

export const auth = createMiddleware(async function (c, next) {
  const headerToken = c.req.header("Proxy-Authorization");
  if (!headerToken) throw new HTTPException(407);

  const accessToken = headerToken.slice("Bearer ".length);
  if (!accessTokenRegex.test(accessToken)) throw new HTTPException(407);

  const verifyExit = await Oauth.Openauth.use((openauth) =>
    Redacted.make(accessToken).pipe(openauth.verify),
  ).pipe(openauthRuntime.runPromiseExit);

  if (Exit.isFailure(verifyExit)) throw new HTTPException(407);

  const accessExit = AccessControl.clientPermissionPolicy("papercut_api_gateway:read").pipe(
    Effect.provideService(
      Actor,
      new ActorsContract.Actor({ properties: verifyExit.value.subject.properties.actor }),
    ),
    Effect.runSyncExit,
  );
  if (Exit.isFailure(accessExit)) throw new HTTPException(403);

  return next();
});
