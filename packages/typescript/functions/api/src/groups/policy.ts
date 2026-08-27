import { Api } from "@printdesk/core/api";
import { PolicyDispatcher } from "@printdesk/core/policies/dispatcher";
import { orDieWhenUnrespondable } from "@printdesk/core/utils";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";

import { policyDispatcherLayer } from "../lib/policy";
import { authMiddlewareLayer } from "../middleware/auth";
import { errorMiddlewareLayer } from "../middleware/error";

export const basePolicyGroupLayer = HttpApiBuilder.group(
  Api,
  "Policy",
  Effect.fn(function* (handlers) {
    const dispatcher = yield* PolicyDispatcher;

    return handlers.handle(
      "query",
      Effect.fn("Api.Policy.query")(({ query: policy }) =>
        dispatcher.dispatch(policy.name, policy.input).pipe(
          Effect.as(true),
          Effect.catchTag("AccessDeniedError", () => Effect.succeed(false)),
          Effect.map((output) => ({ ...policy, output })),
          orDieWhenUnrespondable,
        ),
      ),
    );
  }),
);

export const policyGroupLayer = basePolicyGroupLayer.pipe(
  Layer.provide([authMiddlewareLayer, errorMiddlewareLayer, policyDispatcherLayer]),
);
