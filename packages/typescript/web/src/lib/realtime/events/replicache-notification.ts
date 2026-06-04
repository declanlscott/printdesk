import { AccessControl } from "@printdesk/core/access-control";
import { Actor } from "@printdesk/core/actors";
import { PolicyDispatcher } from "@printdesk/core/policies/client/dispatcher";
import { layer as policyDispatcherLayer } from "@printdesk/core/policies/client/dispatcher/layer";
import { Realtime } from "@printdesk/core/realtime/client";
import { Replicache } from "@printdesk/core/replicache/client";
import { ReplicacheContract } from "@printdesk/core/replicache/contracts";
import * as Effect from "effect/Effect";
import * as Iterable from "effect/Iterable";
import * as Layer from "effect/Layer";
import * as Match from "effect/Match";
import * as Path from "effect/Path";
import * as Struct from "effect/Struct";
import * as Atom from "effect/unstable/reactivity/Atom";

import { realtimeEventAtomLayer } from ".";
import { realtimeAtom } from "..";
import { actorAtom } from "../../actor";
import { networkMonitorAtom } from "../../network";
import { replicacheAtom } from "../../replicache";

export const replicacheNotificationAtom = Realtime.makeEventAtom(ReplicacheContract.notification, {
  runtime: realtimeEventAtomLayer.pipe(
    Layer.merge([Path.layer, policyDispatcherLayer]),
    Layer.provide(Replicache.policiesLayer),
    Atom.runtime,
  ),
  atoms: {
    realtime: realtimeAtom,
    networkMonitor: networkMonitorAtom,
  },
  getChannel: (get, name) =>
    actorAtom.pipe(
      get,
      Struct.get("assertUser"),
      Effect.flatMap(({ tenantId }) =>
        Path.Path.useSync((path) => `/${path.join(tenantId, name)}` as const),
      ),
    ),
  handler: Effect.fn(function* (get, notification) {
    const replicache = yield* replicacheAtom.pipe(get.result);

    if ((yield* replicache.clientGroupId) === notification.clientGroupId) return;

    const policyDispatcher = yield* PolicyDispatcher;

    return yield* Effect.firstSuccessOf(
      Iterable.map(notification.data, (data) =>
        Match.value(data).pipe(
          Match.tagsExhaustive({
            ReplicachePullPermission: ({ permission }) =>
              AccessControl.userPermissionPolicy(permission),
            ReplicachePullPolicy: (policy) =>
              policyDispatcher.dispatch(policy.name, policy.input).pipe(replicache.query),
          }),
          Effect.tapError((error) =>
            error._tag === "AccessDeniedError" ? Effect.void : Effect.logError(error),
          ),
        ),
      ),
    ).pipe(
      Effect.provideService(Actor, actorAtom.pipe(get)),
      Effect.flatMap(() => replicache.pull),
      Effect.catchTag("ReplicachePullError", Effect.logError),
      Effect.catch(() => Effect.void),
    );
  }),
});
