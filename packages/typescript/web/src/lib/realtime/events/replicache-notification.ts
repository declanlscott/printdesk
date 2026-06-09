import { AccessControl } from "@printdesk/core/access-control";
import { ActorLayerMap } from "@printdesk/core/actors";
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
    Layer.merge([Path.layer, ActorLayerMap.layer, policyDispatcherLayer]),
    Layer.provide(Replicache.policiesLayer),
    Atom.runtime,
  ),
  atoms: {
    realtime: realtimeAtom,
    networkMonitor: networkMonitorAtom,
  },
  getChannel: (get, name) =>
    get.resultOnce(actorAtom).pipe(
      Effect.flatMap(Struct.get("assertUser")),
      Effect.flatMap(({ tenantId }) =>
        Path.Path.useSync((path) => `/${path.join(tenantId, name)}` as const),
      ),
    ),
  handler: Effect.fn(function* (get, notification) {
    const replicache = yield* get.result(replicacheAtom);

    if ((yield* replicache.clientGroupId) === notification.clientGroupId) return;

    const policyDispatcher = yield* PolicyDispatcher;

    return yield* Effect.firstSuccessOf(
      Iterable.map(notification.data, (data) =>
        Match.valueTags(data, {
          ReplicachePullPermission: ({ permission }) =>
            AccessControl.userPermissionPolicy(permission),
          ReplicachePullPolicy: (policy) =>
            policyDispatcher.dispatch(policy.name, policy.input).pipe(replicache.query),
        }).pipe(
          Effect.tapError((error) =>
            error._tag === "AccessDeniedError" ? Effect.void : Effect.logError(error),
          ),
        ),
      ),
    ).pipe(
      Effect.provide(get.resultOnce(actorAtom).pipe(Effect.map(ActorLayerMap.get), Layer.unwrap)),
      Effect.flatMap(() => replicache.pull),
      Effect.catchTag("ReplicachePullError", Effect.logError),
      Effect.catch(() => Effect.void),
    );
  }),
});
