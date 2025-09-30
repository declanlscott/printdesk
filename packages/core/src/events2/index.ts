import { Effect, Schema } from "effect";

import { DataAccessProcedures } from "../data-access2/procedures";
import { Permissions } from "../permissions2";

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

  export const ReplicachePullPermission =
    Permissions.Schemas.ReadPermission.pipe(
      Effect.map((permission) =>
        Schema.TaggedStruct("ReplicachePullPermission", { permission }),
      ),
    );
  export type ReplicachePullPermission = Effect.Effect.Success<
    typeof ReplicachePullPermission
  >["Type"];

  export const replicachePullPolicyTagName = "ReplicachePullPolicy" as const;
  export const ReplicachePullPolicy = DataAccessProcedures.Policies.Policy.pipe(
    Effect.map(
      Schema.extend(
        Schema.Struct({
          _tag: Schema.tag(replicachePullPolicyTagName),
        }),
      ),
    ),
  );
  export type ReplicachePullPolicy = Effect.Effect.Success<
    typeof ReplicachePullPolicy
  >["Type"];

  export const makeReplicachePullPolicy = <
    TPolicy extends Effect.Effect.Success<
      typeof DataAccessProcedures.Policies.Policy
    >["Type"],
  >(
    policy: TPolicy,
  ) =>
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    ({
      ...policy,
      _tag: replicachePullPolicyTagName,
    }) as const;

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
