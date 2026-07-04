import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { ReplicacheNotifier } from ".";
import { Actor } from "../../actors";
import { AwsCredentialIdentity } from "../../aws/credential-identity";
import { Database } from "../../database";
import { RealtimeEventHandlers } from "../../handlers/realtime-events";
import { Realtime } from "../../realtime";
import { ReplicacheClientGroupId } from "../client-group-id";
import { ReplicacheContract } from "../contracts";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const realtime = yield* Realtime;
  const db = yield* Database;

  const notify = Effect.fn("ReplicacheNotifier.notify")(
    (data: ReplicacheContract.Notification["data"]) =>
      Effect.context<Actor | AwsCredentialIdentity | ReplicacheClientGroupId>().pipe(
        Effect.flatMap((context) =>
          ReplicacheClientGroupId.useSync(
            (clientGroupId) => new ReplicacheContract.Notification({ clientGroupId, data }),
          ).pipe(
            Effect.flatMap((notification) =>
              RealtimeEventHandlers.registry
                .resolve("/replicache/notification")
                .pipe(Effect.map((handler) => handler.make(notification))),
            ),
            Effect.flatMap(realtime.publish),
            Effect.catchCause((cause) =>
              Effect.logError("[ReplicacheNotifier]: Replicache notification failed:", cause),
            ),
            Effect.provideContext(context),
            db.afterTransaction,
          ),
        ),
      ),
  );

  return { notify } as const;
});

export const layer = makeService.pipe(Layer.effect(ReplicacheNotifier));
