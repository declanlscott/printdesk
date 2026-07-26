import { AccessControl } from "@printdesk/core/access-control";
import { ActorLayerMap } from "@printdesk/core/actors";
import { Api } from "@printdesk/core/api";
import { ActorMiddleware } from "@printdesk/core/api/middleware/actor";
import { AwsCredentialIdentityProviderMiddleware } from "@printdesk/core/api/middleware/aws";
import { AppconfigCredentialIdentityProviderLayerMap } from "@printdesk/core/aws/credential-identity/appconfig";
import { Config } from "@printdesk/core/config";
import { orDieWhenUnrespondable } from "@printdesk/core/utils";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";

import { openauthLayer } from "../lib/auth";
import { configLayer } from "../lib/config";

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
    ActorMiddleware.layer,
    AwsCredentialIdentityProviderMiddleware.appconfigLayer,
    configLayer,
  ]),
  Layer.provide([
    ActorLayerMap.layer,
    AppconfigCredentialIdentityProviderLayerMap.layer,
    openauthLayer,
  ]),
);

export const configGroupsLayer = Layer.mergeAll(papercutMfConfigGroupLayer);
