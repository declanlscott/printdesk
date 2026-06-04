import * as Array from "effect/Array";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Match from "effect/Match";
import * as Number from "effect/Number";
import * as Option from "effect/Option";
import * as Ordering from "effect/Ordering";
import * as Result from "effect/Result";
import * as Struct from "effect/Struct";

import { WorkflowStatusesMutations } from ".";
import { AccessControl } from "../../../../access-control";
import { Mutation } from "../../../../mutations";
import { WorkflowStatusesContract } from "../../../contracts";
import { SharedAccountWorkflowsPolicies } from "../../shared-account/policies";
import { WorkflowStatusesPolicies } from "../policies";
import { WorkflowStatusesReadRepository } from "../read-repository";
import { WorkflowStatusesWriteRepository } from "../write-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const readRepository = yield* WorkflowStatusesReadRepository;
  const writeRepository = yield* WorkflowStatusesWriteRepository;

  const sharedAccountWorkflowPolicies = yield* SharedAccountWorkflowsPolicies;
  const policies = yield* WorkflowStatusesPolicies;

  const append = Mutation.make(WorkflowStatusesContract.append, {
    makePolicy: (args) =>
      AccessControl.some(
        AccessControl.userPermissionPolicy("workflow_statuses:create"),
        Match.value(args).pipe(
          Match.when({ roomWorkflowId: Match.null }, (args) =>
            sharedAccountWorkflowPolicies.isManagerAuthorized.make({
              id: args.sharedAccountWorkflowId,
              managerId: Option.none(),
            }),
          ),
          Match.orElse(() => AccessControl.userPermissionPolicy("rooms:update")),
        ),
      ),
    mutator: (workflowStatus, { tenantId }) =>
      readRepository
        .findLastByWorkflowId(
          workflowStatus.roomWorkflowId ?? workflowStatus.sharedAccountWorkflowId,
        )
        .pipe(
          Effect.map(Struct.get("index")),
          Effect.map(Number.increment),
          Effect.catchTag("NoSuchElementError", () => Effect.succeed(0)),
          Effect.flatMap((index) =>
            WorkflowStatusesContract.Table.Dto.makeEffect({
              ...workflowStatus,
              index,
              tenantId,
            }),
          ),
          Effect.flatMap(writeRepository.create),
        ),
  });

  const edit = Mutation.make(WorkflowStatusesContract.edit, {
    makePolicy: ({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("workflow_statuses:update"),
        policies.canEdit.make({ id }),
      ),
    mutator: ({ id, ...workflowStatus }) =>
      writeRepository.updateById(id, () => Effect.succeed(workflowStatus)),
  });

  const reorder = Mutation.make(WorkflowStatusesContract.reorder, {
    makePolicy: ({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("workflow_statuses:update"),
        policies.canEdit.make({ id }),
      ),
    mutator: Effect.fn(function* ({ id, index, updatedAt }) {
      const slice = yield* readRepository.findSlice(id, index).pipe(
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

      return yield* Effect.all(
        Array.map(slice, (status, i) =>
          writeRepository.updateById(status.id, () =>
            Effect.succeed({
              index: status.index + (i === 0 ? delta : shift),
              updatedAt,
            }),
          ),
        ),
        { concurrency: "unbounded" },
      );
    }),
  });

  const delete_ = Mutation.make(WorkflowStatusesContract.delete_, {
    makePolicy: ({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("workflow_statuses:delete"),
        policies.canDelete.make({ id }),
      ),
    mutator: Effect.fn(function* ({ id, deletedAt }) {
      const slice = yield* readRepository.findTailSliceById(id);

      const deleted = yield* writeRepository
        .deleteById(id)
        .pipe(Effect.map((value) => ({ ...value, deletedAt })));

      yield* Effect.all(
        Array.filterMap(slice, (status, i) =>
          i === 0
            ? Result.failVoid
            : Result.succeed(
                writeRepository.updateById(status.id, () =>
                  Effect.succeed({
                    index: status.index - 1,
                    updatedAt: deletedAt,
                  }),
                ),
              ),
        ),
        { concurrency: "unbounded" },
      );

      return deleted;
    }),
  });

  return { append, edit, reorder, delete: delete_ } as const;
});

export const layer = makeService.pipe(Layer.effect(WorkflowStatusesMutations));
