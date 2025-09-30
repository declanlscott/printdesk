import {
  Array,
  Cause,
  Effect,
  Equal,
  Match,
  Number,
  Option,
  Order,
  Ordering,
  Struct,
} from "effect";

import { AccessControl } from "../access-control2";
import { DataAccessContract } from "../data-access2/contract";
import { Models } from "../models2";
import { Orders } from "../orders2/client";
import { Replicache } from "../replicache2/client";
import {
  SharedAccountWorkflowsContract,
  WorkflowStatusesContract,
} from "./contracts";

import type { ColumnsContract } from "../columns2/contract";
import type { SharedAccountManagerAuthorizationsContract } from "../shared-accounts2/contracts";
import type { RoomWorkflowsContract } from "./contracts";

export namespace RoomWorkflows {
  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/workflows/client/RoomsReadRepository",
    {
      dependencies: [
        Models.SyncTables.Default,
        Replicache.ReadTransactionManager.Default,
      ],
      effect: Models.SyncTables.roomWorkflows.pipe(
        Effect.flatMap(Replicache.makeReadRepository),
      ),
    },
  ) {}

  export class WriteRepository extends Effect.Service<WriteRepository>()(
    "@printdesk/core/workflows/client/RoomsWriteRepository",
    {
      dependencies: [
        Models.SyncTables.Default,
        ReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: Effect.gen(function* () {
        const table = yield* Models.SyncTables.roomWorkflows;
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
          repository.findAll.pipe(
            Effect.map(
              Array.filterMap((rw) =>
                Equal.equals(rw.roomId, roomId)
                  ? Option.some(base.updateById(rw.id, () => roomWorkflow))
                  : Option.none(),
              ),
            ),
            Effect.flatMap(Effect.allWith({ concurrency: "unbounded" })),
          );

        const deleteByRoomId = (
          roomId: RoomWorkflowsContract.DataTransferObject["roomId"],
        ) =>
          repository.findAll.pipe(
            Effect.map(
              Array.filterMap((rw) =>
                Equal.equals(rw.roomId, roomId)
                  ? Option.some(base.deleteById(rw.id))
                  : Option.none(),
              ),
            ),
            Effect.flatMap(Effect.allWith({ concurrency: "unbounded" })),
          );

        return { ...base, updateByRoomId, deleteByRoomId } as const;
      }),
    },
  ) {}
}

export namespace SharedAccountWorkflows {
  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/workflows/client/SharedAccountsReadRepository",
    {
      dependencies: [
        Models.SyncTables.Default,
        Replicache.ReadTransactionManager.Default,
      ],
      effect: Effect.gen(function* () {
        const table = yield* Models.syncTables.sharedAccountWorkflows;
        const base = yield* Replicache.makeReadRepository(table);
        const { scan } = yield* Replicache.ReadTransactionManager;

        const sharedAccountManagerAuthorizationsTable =
          yield* Models.SyncTables.sharedAccountManagerAuthorizations;

        const findActiveManagerAuthorized = (
          managerId: SharedAccountManagerAuthorizationsContract.DataTransferObject["managerId"],
          id: SharedAccountWorkflowsContract.DataTransferObject["id"],
        ) =>
          base.findById(id).pipe(
            Effect.flatMap((workflow) =>
              scan(sharedAccountManagerAuthorizationsTable).pipe(
                Effect.map(
                  Array.filterMap((authorization) =>
                    Equal.equals(
                      authorization.sharedAccountId,
                      workflow.sharedAccountId,
                    ) && Equal.equals(authorization.managerId, managerId)
                      ? Option.some(workflow)
                      : Option.none(),
                  ),
                ),
              ),
            ),
            Effect.flatMap(Array.head),
          );

        return { ...base, findActiveManagerAuthorized };
      }),
    },
  ) {}

  export class WriteRepository extends Effect.Service<WriteRepository>()(
    "@printdesk/core/workflows/client/SharedAccountsWriteRepository",
    {
      dependencies: [
        Models.SyncTables.Default,
        ReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: Effect.all([
        Models.SyncTables.sharedAccountWorkflows,
        ReadRepository,
      ]).pipe(
        Effect.flatMap((args) => Replicache.makeWriteRepository(...args)),
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

        const isManagerAuthorized = DataAccessContract.makePolicy(
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

        return { isManagerAuthorized } as const;
      }),
    },
  ) {}
}

export namespace WorkflowStatuses {
  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/workflows/client/StatusesReadRepository",
    {
      dependencies: [
        Models.SyncTables.Default,
        Replicache.ReadTransactionManager.Default,
      ],
      effect: Effect.gen(function* () {
        const table = yield* Models.syncTables.workflowStatuses;
        const base = yield* Replicache.makeReadRepository(table);

        const findLastByWorkflowId = (workflowId: ColumnsContract.EntityId) =>
          base.findAll.pipe(
            Effect.map(
              Array.filterMap((ws) =>
                Equal.equals(ws.roomWorkflowId, workflowId) ||
                Equal.equals(ws.sharedAccountWorkflowId, workflowId)
                  ? Option.some(ws)
                  : Option.none(),
              ),
            ),
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
              base.findAll.pipe(
                Effect.map(
                  Array.filterMap((ws) =>
                    (Equal.equals(
                      ws.roomWorkflowId,
                      workflowStatus.roomWorkflowId,
                    ) ||
                      Equal.equals(
                        ws.sharedAccountWorkflowId,
                        workflowStatus.sharedAccountWorkflowId,
                      )) &&
                    Number.between(ws.index, {
                      minimum: Number.min(workflowStatus.index, index),
                      maximum: Number.max(workflowStatus.index, index),
                    })
                      ? Option.some(ws)
                      : Option.none(),
                  ),
                ),
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
                base.findAll.pipe(
                  Effect.map(
                    Array.filterMap((ws) =>
                      (Equal.equals(
                        ws.roomWorkflowId,
                        workflowStatus.roomWorkflowId,
                      ) ||
                        Equal.equals(
                          ws.sharedAccountWorkflowId,
                          workflowStatus.sharedAccountWorkflowId,
                        )) &&
                      Number.greaterThanOrEqualTo(
                        ws.index,
                        workflowStatus.index,
                      )
                        ? Option.some(ws)
                        : Option.none(),
                    ),
                  ),
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
      dependencies: [
        Models.SyncTables.Default,
        ReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: Effect.all([
        Models.SyncTables.workflowStatuses,
        ReadRepository,
      ]).pipe(
        Effect.flatMap((args) => Replicache.makeWriteRepository(...args)),
      ),
    },
  ) {}

  export class Policies extends Effect.Service<Policies>()(
    "@printdesk/core/workflows/StatusesPolicies",
    {
      accessors: true,
      dependencies: [
        ReadRepository.Default,
        SharedAccountWorkflows.ReadRepository.Default,
        Orders.ReadRepository.Default,
      ],
      effect: Effect.gen(function* () {
        const repository = yield* ReadRepository;
        const sharedAccountWorkflowRepository =
          yield* SharedAccountWorkflows.ReadRepository;
        const ordersRepository = yield* Orders.ReadRepository;

        const isEditable = DataAccessContract.makePolicy(
          WorkflowStatusesContract.isEditable,
          {
            make: ({ id }) =>
              AccessControl.policy((principal) =>
                repository.findById(id).pipe(
                  Effect.flatMap((workflowStatus) =>
                    Match.value(workflowStatus).pipe(
                      Match.when({ roomWorkflowId: Match.null }, (status) =>
                        sharedAccountWorkflowRepository
                          .findActiveManagerAuthorized(
                            principal.userId,
                            status.sharedAccountWorkflowId,
                          )
                          .pipe(
                            Effect.andThen(true),
                            Effect.catchTag("NoSuchElementException", () =>
                              Effect.succeed(false),
                            ),
                          ),
                      ),
                      Match.orElse(() =>
                        Effect.succeed(principal.acl.has("rooms:update")),
                      ),
                    ),
                  ),
                ),
              ),
          },
        );

        const isDeletable = DataAccessContract.makePolicy(
          WorkflowStatusesContract.isDeletable,
          {
            make: ({ id }) =>
              AccessControl.every(
                AccessControl.policy(() =>
                  ordersRepository
                    .findByWorkflowStatusId(id)
                    .pipe(Effect.map(Array.isEmptyArray)),
                ),
                isEditable.make({ id }),
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

        const append = DataAccessContract.makeMutation(
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

        const edit = DataAccessContract.makeMutation(
          WorkflowStatusesContract.edit,
          {
            makePolicy: ({ id }) =>
              AccessControl.some(
                AccessControl.permission("workflow_statuses:update"),
                policies.isEditable.make({ id }),
              ),
            mutator: ({ id, ...workflowStatus }) =>
              writeRepository.updateById(id, () => workflowStatus),
          },
        );

        const reorder = DataAccessContract.makeMutation(
          WorkflowStatusesContract.reorder,
          {
            makePolicy: ({ id }) =>
              AccessControl.some(
                AccessControl.permission("workflow_statuses:update"),
                policies.isEditable.make({ id }),
              ),
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

        const delete_ = DataAccessContract.makeMutation(
          WorkflowStatusesContract.delete_,
          {
            makePolicy: ({ id }) =>
              AccessControl.some(
                AccessControl.permission("workflow_statuses:delete"),
                policies.isDeletable.make({ id }),
              ),
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
                            index: Number.decrement(status.index),
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
