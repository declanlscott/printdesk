import * as Effect from "effect/Effect";
import * as Iterable from "effect/Iterable";
import * as Layer from "effect/Layer";
import * as Match from "effect/Match";

import { ReplicacheEvents } from ".";
import { Replicache } from "..";
import { AccessControl } from "../../../access-control";
import { EventsContract } from "../../../events/contract";
import { PoliciesDispatcher } from "../../../policies/client/dispatcher";
import { ReplicacheContract } from "../../contracts";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const replicache = yield* Replicache.Replicache;
  const policiesDispatcher = yield* PoliciesDispatcher;

  const notification = EventsContract.makeEvent(ReplicacheContract.notification, {
    handler: (notification) =>
      Effect.firstSuccessOf(
        Iterable.map(notification.data, (data) =>
          Match.value(data).pipe(
            Match.tagsExhaustive({
              ReplicachePullPermission: ({ permission }) =>
                AccessControl.userPermissionPolicy(permission),
              ReplicachePullPolicy: (policy) =>
                policiesDispatcher.dispatch(policy.name, policy.input).pipe(replicache.query),
            }),
            Effect.tapError((error) =>
              error._tag === "AccessDeniedError" ? Effect.void : Effect.logError(error),
            ),
          ),
        ),
      ).pipe(
        Effect.flatMap(() => replicache.pull),
        Effect.catchTag("ReplicachePullError", Effect.logError),
        Effect.catch(() => Effect.void),
      ),
  });

  return { notification } as const;
});

export const layer = makeService.pipe(Layer.effect(ReplicacheEvents));
