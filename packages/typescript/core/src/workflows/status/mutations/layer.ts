import { Ordering, Cause } from "effect";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Match from "effect/Match";
import * as Number from "effect/Number";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Struct from "effect/Struct";

import { WorkflowStatusesMutations } from ".";
import { AccessControl } from "../../../access-control";
import { MutationsContract } from "../../../mutations/contract";
import { ReplicacheContract } from "../../../replicache/contracts";
import { ReplicacheNotifier } from "../../../replicache/notifier";
import { WorkflowStatusesContract, SharedAccountWorkflowsContract } from "../../contracts";
import { RoomWorkflowsRepository } from "../../room/repository";
import { SharedAccountWorkflowsPolicies } from "../../shared-account/policies";
import { WorkflowStatusesPolicies } from "../policies";
import { WorkflowStatusesRepository } from "../repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* WorkflowStatusesRepository;
  const roomWorkflowsRepository = yield* RoomWorkflowsRepository;

  const sharedAccountWorkflowPolicies = yield* SharedAccountWorkflowsPolicies;
  const policies = yield* WorkflowStatusesPolicies;

  const notifier = yield* ReplicacheNotifier;

  const notify = (workflowStatus: typeof WorkflowStatusesContract.Table.Model.Type) =>
    Match.value(workflowStatus).pipe(
      Match.when({ roomWorkflowId: Match.null }, (s) =>
        Effect.succeed(
          Array.make(
            ReplicacheContract.PullPermission.make({ permission: "workflow_statuses:read" }),
            ReplicacheContract.PullPermission.make({ permission: "active_workflow_statuses:read" }),
            ReplicacheContract.PullPolicy.make(
              SharedAccountWorkflowsContract.isCustomerAuthorized.make({
                id: s.sharedAccountWorkflowId,
                customerId: Option.none(),
              }),
            ),
            ReplicacheContract.PullPolicy.make(
              SharedAccountWorkflowsContract.isManagerAuthorized.make({
                id: s.sharedAccountWorkflowId,
                managerId: Option.none(),
              }),
            ),
          ),
        ),
      ),
      Match.orElse((s) =>
        roomWorkflowsRepository.findActivePublishedById(s.roomWorkflowId, s.tenantId).pipe(
          Effect.map(() =>
            Array.make(
              ReplicacheContract.PullPermission.make({ permission: "workflow_statuses:read" }),
              ReplicacheContract.PullPermission.make({
                permission: "active_workflow_statuses:read",
              }),
              ReplicacheContract.PullPermission.make({
                permission: "active_published_room_workflow_statuses:read",
              }),
            ),
          ),
          Effect.catchTag("NoSuchElementError", () =>
            Effect.succeed(
              Array.make(
                ReplicacheContract.PullPermission.make({ permission: "workflow_statuses:read" }),
                ReplicacheContract.PullPermission.make({
                  permission: "active_workflow_statuses:read",
                }),
              ),
            ),
          ),
        ),
      ),
      Effect.flatMap(notifier.notify),
      Effect.catch(() => Effect.void),
    );

  const append = MutationsContract.makeMutation(WorkflowStatusesContract.append, {
    makePolicy: Effect.fn("WorkflowStatuses.Mutations.append.makePolicy")((workflowStatus) =>
      AccessControl.some(
        AccessControl.userPermissionPolicy("workflow_statuses:create"),
        Match.value(workflowStatus).pipe(
          Match.when({ roomWorkflowId: Match.null }, (workflowStatus) =>
            sharedAccountWorkflowPolicies.isManagerAuthorized.make({
              id: workflowStatus.sharedAccountWorkflowId,
              managerId: Option.none(),
            }),
          ),
          Match.orElse(() => AccessControl.userPermissionPolicy("rooms:update")),
        ),
      ),
    ),
    mutator: Effect.fn("WorkflowStatuses.Mutation.append.mutator")((workflowStatus, { tenantId }) =>
      repository
        .findLastByWorkflowId(
          workflowStatus.roomWorkflowId ?? workflowStatus.sharedAccountWorkflowId,
          tenantId,
        )
        .pipe(
          Effect.map(Struct.get("index")),
          Effect.map(Number.increment),
          Effect.catchTag("NoSuchElementError", () => Effect.succeed(0)),
          Effect.flatMap((index) => repository.create({ ...workflowStatus, index, tenantId })),
          Effect.tap(notify),
        ),
    ),
  });

  const edit = MutationsContract.makeMutation(WorkflowStatusesContract.edit, {
    makePolicy: Effect.fn("WorkflowStatuses.Mutations.edit.makePolicy")(({ id }) =>
      AccessControl.some(
        AccessControl.userPermissionPolicy("workflow_statuses:update"),
        policies.canEdit.make({ id }),
      ),
    ),
    mutator: Effect.fn("WorkflowStatuses.Mutations.edit.mutator")(
      ({ id, ...workflowStatus }, user) =>
        repository.updateById(id, workflowStatus, user.tenantId).pipe(Effect.tap(notify)),
    ),
  });

  const reorder = MutationsContract.makeMutation(WorkflowStatusesContract.reorder, {
    makePolicy: Effect.fn("WorkflowStatuses.Mutations.reorder.makePolicy")(({ id }) =>
      AccessControl.some(
        AccessControl.userPermissionPolicy("workflow_statuses:update"),
        policies.canEdit.make({ id }),
      ),
    ),
    mutator: Effect.fn("WorkflowStatuses.Mutations.reorder.mutator")(
      function* ({ id, index, updatedAt }, user) {
        const slice = yield* repository.findSliceForUpdate(id, user.tenantId, index).pipe(
          Effect.flatMap((slice) =>
            Array.last(slice).pipe(
              Effect.fromOption,
              Effect.map((status) => (status.id === id ? Array.reverse(slice) : slice)),
            ),
          ),
        );

        const delta = yield* Array.head(slice).pipe(
          Effect.fromOption,
          Effect.map(Struct.get("index")),
          Effect.map(Number.subtract(index)),
          Effect.map(Number.multiply(-1)),
        );
        const shift = Ordering.reverse(Number.sign(delta));

        if (!shift)
          return yield* new Cause.IllegalArgumentError(
            `Invalid workflow status index, delta with existing index must be non-zero.`,
          );

        const actualDelta = (slice.length - 1) * -shift;
        if (delta !== actualDelta)
          return yield* new Cause.IllegalArgumentError(
            `Invalid workflow status index, delta mismatch. Delta: ${delta}, actual delta: ${actualDelta}.`,
          );

        // Temporarily negate indexes to avoid uniqueness violations during upsert
        yield* repository.negateMany(Array.map(slice, Struct.get("id")), user.tenantId);

        return yield* repository.upsertMany(
          Array.map(slice, (status, i) => ({
            ...status,
            index: status.index + (i === 0 ? delta : shift),
            updatedAt,
          })),
        );
      },
      Effect.tap((changed) => Array.head(changed).pipe(Effect.fromOption, Effect.map(notify))),
    ),
  });

  const delete_ = MutationsContract.makeMutation(WorkflowStatusesContract.delete_, {
    makePolicy: Effect.fn("WorkflowStatuses.Mutations.delete.makePolicy")(({ id }) =>
      AccessControl.some(
        AccessControl.userPermissionPolicy("workflow_statuses:delete"),
        policies.canDelete.make({ id }),
      ),
    ),
    mutator: Effect.fn("WorkflowStatuses.Mutations.delete.mutator")(function* (
      { id, deletedAt },
      user,
    ) {
      const slice = yield* repository.findTailSliceByIdForUpdate(id, user.tenantId);

      const deleted = yield* repository.deleteById(id, user.tenantId);

      yield* repository.upsertMany(
        Array.filterMap(slice, (status, i) =>
          i === 0
            ? Result.failVoid
            : Result.succeed({ ...status, index: status.index - 1, updatedAt: deletedAt }),
        ),
      );

      return deleted;
    }, Effect.tap(notify)),
  });

  return { append, edit, reorder, delete: delete_ } as const;
});

export const layer = makeService.pipe(Layer.effect(WorkflowStatusesMutations));
