import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { Permissions } from "../permissions";
import { Procedures } from "../procedures";

export namespace Events {
  export class InfraProvisionResult extends Schema.TaggedClass<InfraProvisionResult>(
    "InfraProvisionResult",
  )("InfraProvisionResult", {
    success: Schema.Boolean,
    dispatchId: Schema.String,
    retrying: Schema.Boolean,
  }) {}

  export class PapercutSyncResult extends Schema.TaggedClass<PapercutSyncResult>(
    "PapercutSyncResult",
  )("PapercutSyncResult", {
    success: Schema.Boolean,
    dispatchId: Schema.String,
  }) {}

  export const ReplicachePullPermission = Permissions.SyncReadPermission.pipe(
    Effect.map((permission) =>
      Schema.TaggedStruct("ReplicachePullPermission", { permission }),
    ),
  );
  export type ReplicachePullPermission = Effect.Effect.Success<
    typeof ReplicachePullPermission
  >["Type"];

  export const replicachePullPolicyTagName = "ReplicachePullPolicy" as const;

  export const ReplicachePullPolicy = Procedures.Policies.registry.pipe(
    Effect.map(Struct.get("Schema")),
    Effect.map(
      Schema.extend(
        Schema.Struct({ _tag: Schema.tag(replicachePullPolicyTagName) }),
      ),
    ),
  );
  export type ReplicachePullPolicy = Effect.Effect.Success<
    typeof ReplicachePullPolicy
  >["Type"];

  export const makeReplicachePullPolicy = <
    TPolicy extends Effect.Effect.Success<
      typeof Procedures.Policies.registry
    >["Schema"]["Type"],
  >(
    policy: TPolicy,
  ) => ({ ...policy, _tag: replicachePullPolicyTagName }) as const;

  export const ReplicacheNotification = Effect.all([
    ReplicachePullPermission,
    ReplicachePullPolicy,
  ]).pipe(
    Effect.map((members) => Schema.Union(...members)),
    Effect.map(Schema.Array),
    Effect.map((data) =>
      Schema.Struct({ clientGroupId: Schema.UUID.pipe(Schema.optional), data }),
    ),
  );
  export type ReplicacheNotification = Effect.Effect.Success<
    typeof ReplicacheNotification
  >["Type"];

  export const Event = ReplicacheNotification.pipe(
    Effect.map((ReplicacheNotification) =>
      Schema.Union(
        InfraProvisionResult,
        PapercutSyncResult,
        ReplicacheNotification,
      ),
    ),
    Effect.map((event) => Schema.parseJson(event)),
  );
  export type Event = Effect.Effect.Success<typeof Event>["Type"];
}
