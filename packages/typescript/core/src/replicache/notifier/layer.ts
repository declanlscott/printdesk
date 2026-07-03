import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Struct from "effect/Struct";

import { ReplicacheNotifier } from ".";
import { Actor } from "../../actors";
import { AwsCredentialIdentity } from "../../aws/credential-identity";
import { Database } from "../../database";
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
            Effect.map(ReplicacheContract.notification.make),
            Effect.map(Struct.renameKeys({ name: "subchannel", input: "data" })),
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
