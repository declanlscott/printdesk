import { AccessControl } from "@printdesk/core/access-control";
import { Api } from "@printdesk/core/api";
import { Config } from "@printdesk/core/config";
import * as Effect from "effect/Effect";
import * as Filter from "effect/Filter";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";
import * as HttpServerRespondable from "effect/unstable/http/HttpServerRespondable";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";

import { configLayer } from "../lib/config";
import { appconfigAwsCredentialIdentityLayer } from "../middleware/aws-credential-identity/appconfig";

export const basePapercutConfigGroupLayer = HttpApiBuilder.group(
  Api,
  "PapercutConfig",
  Effect.fn(function* (handlers) {
    const config = yield* Config;

    return handlers.handle(
      "setApiAuthToken",
      Effect.fn("Api.PapercutConfig.setApiAuthToken")(({ payload }) =>
        config.setPapercutApiAuthToken(payload.token).pipe(
          Effect.asVoid,
          Effect.catchFilter(
            Filter.make((error) =>
              HttpServerRespondable.isRespondable(error)
                ? Result.fail(error)
                : Result.succeed(error),
            ),
            Effect.die,
          ),
          AccessControl.enforce(AccessControl.privateActorPermissionPolicy("config:update")),
        ),
      ),
    );
  }),
);

export const papercutConfigGroupLayer = basePapercutConfigGroupLayer.pipe(
  Layer.provide([appconfigAwsCredentialIdentityLayer, configLayer]),
);
