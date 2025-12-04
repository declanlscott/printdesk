import * as Array from "effect/Array";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import * as Number from "effect/Number";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import * as Ordering from "effect/Ordering";
import * as Struct from "effect/Struct";

import { AccessControl } from "../access-control";
import { Models } from "../models";
import { MutationsContract } from "../mutations/contract";
import { Orders } from "../orders/client";
import { PoliciesContract } from "../policies/contract";
import { Replicache } from "../replicache/client";
import { SharedAccounts } from "../shared-accounts/client";
import {
  RoomWorkflowsContract,
  SharedAccountWorkflowsContract,
  WorkflowStatusesContract,
} from "./contracts";

import type { ColumnsContract } from "../columns/contract";
import type { SharedAccountManagerAccessContract } from "../shared-accounts/contracts";

export namespace RoomWorkflows {
  const table = Models.syncTables[RoomWorkflowsContract.tableName];

  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/workflows/client/RoomsReadRepository",
    {
      dependencies: [Replicache.ReadTransactionManager.Default],
      effect: Replicache.makeReadRepository(table),
    },
  ) {}

  export class WriteRepository extends Effect.Service<WriteRepository>()(
    "@printdesk/core/workflows/client/RoomsWriteRepository",
    {
      accessors: true,
      dependencies: [
        ReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: Effect.gen(function* () {
        const repository = yield* ReadRepository;
        const base = yield* Replicache.makeWriteRepository(table, repository);

        const updateByRoomId = (
          roomId: RoomWorkflowsContract.DataTransferObject["roomId"],
          roomWorkflow: Partial<
            Omit<
              RoomWorkflowsContract.DataTransferObject,
              "id" | "roomId" | "tenantId"
            >
          >,
        ) =>
          repository
            .findWhere((w) =>
              w.roomId === roomId
                ? Option.some(base.updateById(w.id, () => roomWorkflow))
                : Option.none(),
            )
            .pipe(Effect.flatMap(Effect.allWith({ concurrency: "unbounded" })));

        const deleteByRoomId = (
          roomId: RoomWorkflowsContract.DataTransferObject["roomId"],
        ) =>
          repository
            .findWhere((w) =>
              w.roomId === roomId
                ? Option.some(base.deleteById(w.id))
                : Option.none(),
            )
            .pipe(Effect.flatMap(Effect.allWith({ concurrency: "unbounded" })));

        return { ...base, updateByRoomId, deleteByRoomId } as const;
      }),
    },
  ) {}
}

export namespace SharedAccountWorkflows {
  const table = Models.syncTables[SharedAccountWorkflowsContract.tableName];

  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/workflows/client/SharedAccountsReadRepository",
    {
      dependencies: [
        Replicache.ReadTransactionManager.Default,
        SharedAccounts.CustomerAccessReadRepository.Default,
        SharedAccounts.ManagerAccessReadRepository.Default,
      ],
      effect: Effect.gen(function* () {
        const base = yield* Replicache.makeReadRepository(table);

        const sharedAccountCustomerAccessRepository =
          yield* SharedAccounts.CustomerAccessReadRepository;
        const sharedAccountManagerAccessRepository =
          yield* SharedAccounts.ManagerAccessReadRepository;

        const findActiveCustomerAuthorized = (
          customerId: ColumnsContract.EntityId,
          id: SharedAccountWorkflowsContract.DataTransferObject["id"],
        ) =>
          base
            .findById(id)
            .pipe(
              Effect.flatMap((workflow) =>
                sharedAccountCustomerAccessRepository.findWhere((access) =>
                  access.sharedAccountId === workflow.sharedAccountId &&
                  access.customerId === customerId
                    ? Option.some(workflow)
                    : Option.none(),
                ),
              ),
            );

        const findActiveManagerAuthorized = (
          managerId: SharedAccountManagerAccessContract.DataTransferObject["managerId"],
          id: SharedAccountWorkflowsContract.DataTransferObject["id"],
        ) =>
          base.findById(id).pipe(
            Effect.flatMap((workflow) =>
              sharedAccountManagerAccessRepository.findWhere((access) =>
                access.sharedAccountId === workflow.sharedAccountId &&
                access.managerId === managerId
                  ? Option.some(workflow)
                  : Option.none(),
              ),
            ),
            Effect.flatMap(Array.head),
          );

        return {
          ...base,
          findActiveCustomerAuthorized,
          findActiveManagerAuthorized,
        };
      }),
    },
  ) {}

  export class WriteRepository extends Effect.Service<WriteRepository>()(
    "@printdesk/core/workflows/client/SharedAccountsWriteRepository",
    {
      accessors: true,
      dependencies: [
        ReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: ReadRepository.pipe(
        Effect.flatMap((repository) =>
          Replicache.makeWriteRepository(table, repository),
        ),
      ),
    },
  ) {}

  export class Policies extends Effect.Service<Policies>()(
    "@printdesk/core/workflows/client/SharedAccountPolicies",
    {
      accessors: true,
      dependencies: [ReadRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* ReadRepository;

        const isCustomerAuthorized = PoliciesContract.makePolicy(
          SharedAccountWorkflowsContract.isCustomerAuthorized,
          {
            make: ({ id }) =>
              AccessControl.policy((principal) =>
                repository
                  .findActiveCustomerAuthorized(principal.userId, id)
                  .pipe(
                    Effect.andThen(true),
                    Effect.catchTag("NoSuchElementException", () =>
                      Effect.succeed(true),
                    ),
                  ),
              ),
          },
        );

        const isManagerAuthorized = PoliciesContract.makePolicy(
          SharedAccountWorkflowsContract.isManagerAuthorized,
          {
            make: ({ id }) =>
              AccessControl.policy((principal) =>
                repository
                  .findActiveManagerAuthorized(principal.userId, id)
                  .pipe(
                    Effect.andThen(true),
                    Effect.catchTag("NoSuchElementException", () =>
                      Effect.succeed(false),
                    ),
                  ),
              ),
          },
        );

        return { isCustomerAuthorized, isManagerAuthorized } as const;
      }),
    },
  ) {}
}

export namespace WorkflowStatuses {
  const table = Models.syncTables[WorkflowStatusesContract.tableName];

  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/workflows/client/StatusesReadRepository",
    {
      dependencies: [Replicache.ReadTransactionManager.Default],
      effect: Effect.gen(function* () {
        const base = yield* Replicache.makeReadRepository(table);

        const findLastByWorkflowId = (workflowId: ColumnsContract.EntityId) =>
          base
            .findWhere((ws) =>
              ws.roomWorkflowId === workflowId ||
              ws.sharedAccountWorkflowId === workflowId
                ? Option.some(ws)
                : Option.none(),
            )
            .pipe(
              Effect.map(
                Array.sortBy(Order.mapInput(Order.number, Struct.get("index"))),
              ),
              Effect.flatMap(Array.last),
            );

        const findSlice = (
          id: WorkflowStatusesContract.DataTransferObject["id"],
          index: WorkflowStatusesContract.DataTransferObject["index"],
        ) =>
          base.findById(id).pipe(
            Effect.flatMap((workflowStatus) =>
              base.findWhere((ws) =>
                (ws.roomWorkflowId === workflowStatus.roomWorkflowId ||
                  ws.sharedAccountWorkflowId ===
                    workflowStatus.sharedAccountWorkflowId) &&
                Number.between(ws.index, {
                  minimum: Number.min(workflowStatus.index, index),
                  maximum: Number.max(workflowStatus.index, index),
                })
                  ? Option.some(ws)
                  : Option.none(),
              ),
            ),
            Effect.map(
              Array.sortBy(Order.mapInput(Order.number, Struct.get("index"))),
            ),
          );

        const findTailSliceById = (
          id: WorkflowStatusesContract.DataTransferObject["id"],
        ) =>
          base
            .findById(id)
            .pipe(
              Effect.flatMap((workflowStatus) =>
                base.findWhere((ws) =>
                  (ws.roomWorkflowId === workflowStatus.roomWorkflowId ||
                    ws.sharedAccountWorkflowId ===
                      workflowStatus.sharedAccountWorkflowId) &&
                  ws.index >= workflowStatus.index
                    ? Option.some(ws)
                    : Option.none(),
                ),
              ),
            );

        return {
          ...base,
          findLastByWorkflowId,
          findSlice,
          findTailSliceById,
        } as const;
      }),
    },
  ) {}

  export class WriteRepository extends Effect.Service<WriteRepository>()(
    "@printdesk/core/workflows/client/StatusesWriteRepository",
    {
      accessors: true,
      dependencies: [
        ReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: ReadRepository.pipe(
        Effect.flatMap((repository) =>
          Replicache.makeWriteRepository(table, repository),
        ),
      ),
    },
  ) {}

  export class Policies extends Effect.Service<Policies>()(
    "@printdesk/core/workflows/StatusesPolicies",
    {
      accessors: true,
      dependencies: [
        ReadRepository.Default,
        Orders.ReadRepository.Default,
        SharedAccountWorkflows.Policies.Default,
      ],
      effect: Effect.gen(function* () {
        const repository = yield* ReadRepository;
        const ordersRepository = yield* Orders.ReadRepository;

        const sharedAccountWorkflowPolicies =
          yield* SharedAccountWorkflows.Policies;

        const isEditable = PoliciesContract.makePolicy(
          WorkflowStatusesContract.canEdit,
          {
            make: ({ id }) =>
              AccessControl.every(
                AccessControl.permission("workflow_statuses:update"),
                repository.findById(id).pipe(
                  Effect.flatMap((workflowStatus) =>
                    Match.value(workflowStatus).pipe(
                      Match.when({ roomWorkflowId: Match.null }, (s) =>
                        sharedAccountWorkflowPolicies.isManagerAuthorized.make({
                          id: s.sharedAccountWorkflowId,
                        }),
                      ),
                      Match.orElse(() =>
                        AccessControl.permission("rooms:update"),
                      ),
                    ),
                  ),
                ),
              ),
          },
        );

        const isDeletable = PoliciesContract.makePolicy(
          WorkflowStatusesContract.canDelete,
          {
            make: ({ id }) =>
              AccessControl.every(
                AccessControl.permission("workflow_statuses:delete"),
                AccessControl.policy(() =>
                  ordersRepository
                    .findByWorkflowStatusId(id)
                    .pipe(Effect.map(Array.isEmptyArray)),
                ),
                repository.findById(id).pipe(
                  Effect.flatMap((workflowStatus) =>
                    Match.value(workflowStatus).pipe(
                      Match.when({ roomWorkflowId: Match.null }, (s) =>
                        sharedAccountWorkflowPolicies.isManagerAuthorized.make({
                          id: s.sharedAccountWorkflowId,
                        }),
                      ),
                      Match.orElse(() =>
                        AccessControl.permission("rooms:update"),
                      ),
                    ),
                  ),
                ),
              ),
          },
        );

        return { isEditable, isDeletable } as const;
      }),
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/workflows/StatusesMutations",
    {
      accessors: true,
      dependencies: [
        ReadRepository.Default,
        WriteRepository.Default,
        SharedAccountWorkflows.Policies.Default,
        Policies.Default,
      ],
      effect: Effect.gen(function* () {
        const readRepository = yield* ReadRepository;
        const writeRepository = yield* WriteRepository;

        const sharedAccountWorkflowPolicies =
          yield* SharedAccountWorkflows.Policies;
        const policies = yield* Policies;

        const append = MutationsContract.makeMutation(
          WorkflowStatusesContract.append,
          {
            makePolicy: (args) =>
              AccessControl.some(
                AccessControl.permission("workflow_statuses:create"),
                Match.value(args).pipe(
                  Match.when({ roomWorkflowId: Match.null }, (args) =>
                    sharedAccountWorkflowPolicies.isManagerAuthorized.make({
                      id: args.sharedAccountWorkflowId,
                    }),
                  ),
                  Match.orElse(() => AccessControl.permission("rooms:update")),
                ),
              ),
            mutator: (workflowStatus, { tenantId }) =>
              readRepository
                .findLastByWorkflowId(
                  workflowStatus.roomWorkflowId ??
                    workflowStatus.sharedAccountWorkflowId,
                )
                .pipe(
                  Effect.map(Struct.get("index")),
                  Effect.map(Number.increment),
                  Effect.catchTag("NoSuchElementException", () =>
                    Effect.succeed(0),
                  ),
                  Effect.flatMap((index) =>
                    writeRepository.create(
                      Match.value(workflowStatus).pipe(
                        Match.when({ roomWorkflowId: Match.null }, (status) =>
                          WorkflowStatusesContract.SharedAccountWorkflowDto.make(
                            { ...status, index, tenantId },
                          ),
                        ),
                        Match.orElse((status) =>
                          WorkflowStatusesContract.RoomWorkflowDto.make({
                            ...status,
                            index,
                            tenantId,
                          }),
                        ),
                      ),
                    ),
                  ),
                ),
          },
        );

        const edit = MutationsContract.makeMutation(
          WorkflowStatusesContract.edit,
          {
            makePolicy: ({ id }) => policies.isEditable.make({ id }),
            mutator: ({ id, ...workflowStatus }) =>
              writeRepository.updateById(id, () => workflowStatus),
          },
        );

        const reorder = MutationsContract.makeMutation(
          WorkflowStatusesContract.reorder,
          {
            makePolicy: ({ id }) => policies.isEditable.make({ id }),
            mutator: ({ id, index, updatedAt }) =>
              Effect.gen(function* () {
                const slice = yield* readRepository
                  .findSlice(id, index)
                  .pipe(
                    Effect.flatMap((slice) =>
                      Array.last(slice).pipe(
                        Effect.map((status) =>
                          status.id === id ? Array.reverse(slice) : slice,
                        ),
                      ),
                    ),
                  );

                const delta = index - slice[0].index;
                const shift = Ordering.reverse(Number.sign(delta));

                if (!shift)
                  return yield* Effect.fail(
                    new Cause.IllegalArgumentException(
                      `Invalid workflow status index, delta with existing index must be non-zero.`,
                    ),
                  );

                const actualDelta = (slice.length - 1) * -shift;
                if (delta !== actualDelta)
                  return yield* Effect.fail(
                    new Cause.IllegalArgumentException(
                      `Invalid workflow status index, delta mismatch. Delta: ${delta}, actual delta: ${actualDelta}.`,
                    ),
                  );

                return yield* Effect.all(
                  Array.map(slice, (status, i) =>
                    writeRepository.updateById(status.id, () => ({
                      index: status.index + (i === 0 ? delta : shift),
                      updatedAt,
                    })),
                  ),
                  { concurrency: "unbounded" },
                );
              }),
          },
        );

        const delete_ = MutationsContract.makeMutation(
          WorkflowStatusesContract.delete_,
          {
            makePolicy: ({ id }) => policies.isDeletable.make({ id }),
            mutator: ({ id, deletedAt }) =>
              Effect.gen(function* () {
                const slice = yield* readRepository.findTailSliceById(id);

                const deleted = yield* writeRepository.deleteById(id).pipe(
                  Effect.map((value) => ({
                    ...value,
                    deletedAt,
                  })),
                );

                yield* Effect.all(
                  Array.filterMap(slice, (status, i) =>
                    i === 0
                      ? Option.none()
                      : Option.some(
                          writeRepository.updateById(status.id, () => ({
                            index: status.index - 1,
                            updatedAt: deletedAt,
                          })),
                        ),
                  ),
                  { concurrency: "unbounded" },
                );

                return deleted;
              }),
          },
        );

        return { append, edit, reorder, delete: delete_ } as const;
      }),
    },
  ) {}
}
