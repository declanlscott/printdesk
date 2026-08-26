import { AccessControl } from "@printdesk/core/access-control";
import { Api } from "@printdesk/core/api";
import { Config } from "@printdesk/core/config";
import { orDieWhenUnrespondable } from "@printdesk/core/utils";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";

import { authMiddlewareLayer } from "../lib/auth";
import { appconfigCredentialIdentityProviderLayer } from "../lib/aws";
import { configLayer } from "../lib/config";
import { errorMiddlewareLayer } from "../lib/error";

export const basePapercutMfConfigGroupLayer = HttpApiBuilder.group(
  Api,
  "PapercutMfConfig",
  Effect.fn(function* (handlers) {
    const config = yield* Config;

    return handlers.handle(
      "setApiAuthToken",
      Effect.fn("Api.PapercutMfConfig.setApiAuthToken")(({ payload }) =>
        config
          .setPapercutMfApiAuthToken(payload.token)
          .pipe(
            Effect.asVoid,
            orDieWhenUnrespondable,
            AccessControl.enforce(AccessControl.permissionPolicy("config:update")),
          ),
      ),
    );
  }),
);

export const papercutMfConfigGroupLayer = basePapercutMfConfigGroupLayer.pipe(
  Layer.provide([
    authMiddlewareLayer,
    appconfigCredentialIdentityProviderLayer,
    configLayer,
    errorMiddlewareLayer,
  ]),
);

export const configGroupsLayer = Layer.mergeAll(papercutMfConfigGroupLayer);
