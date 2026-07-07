import { AccessControl } from "@printdesk/core/access-control";
import { Api } from "@printdesk/core/api";
import { Config } from "@printdesk/core/config";
import * as Effect from "effect/Effect";
import * as Filter from "effect/Filter";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";
import * as HttpServerRespondable from "effect/unstable/http/HttpServerRespondable";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";

import { appconfigCredentialIdentityProviderMiddlewareLayer } from "../lib/aws";
import { configLayer } from "../lib/config";

export const basePapercutMfConfigGroupLayer = HttpApiBuilder.group(
  Api,
  "PapercutMfConfig",
  Effect.fn(function* (handlers) {
    const config = yield* Config;

    return handlers.handle(
      "setApiAuthToken",
      Effect.fn("Api.PapercutMfConfig.setApiAuthToken")(({ payload }) =>
        config.setPapercutMfApiAuthToken(payload.token).pipe(
          Effect.asVoid,
          Effect.catchFilter(
            Filter.make((error) =>
              HttpServerRespondable.isRespondable(error)
                ? Result.fail(error)
                : Result.succeed(error),
            ),
            Effect.die,
          ),
          AccessControl.enforce(AccessControl.permissionPolicy("config:update")),
        ),
      ),
    );
  }),
);

export const papercutMfConfigGroupLayer = basePapercutMfConfigGroupLayer.pipe(
  Layer.provide([appconfigCredentialIdentityProviderMiddlewareLayer, configLayer]),
);
