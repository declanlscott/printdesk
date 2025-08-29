import { Array, Effect, Equal, Number, Option, Order } from "effect";

import { AccessControl } from "../access-control2";
import { DataAccessContract } from "../data-access2/contract";
import { Replicache } from "../replicache2/client";
import {
  BillingAccountWorkflowsContract,
  RoomWorkflowsContract,
  WorkflowStatusesContract,
} from "./contracts";

export namespace BillingAccountWorkflows {
  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/workflows/client/BillingAccountsReadRepository",
    {
      dependencies: [Replicache.ReadTransactionManager.Default],
      effect: Replicache.makeReadRepository(
        BillingAccountWorkflowsContract.table,
      ),
    },
  ) {}

  export class WriteRepository extends Effect.Service<WriteRepository>()(
    "@printdesk/core/workflows/client/BillingAccountsWriteRepository",
    {
      dependencies: [
        ReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: ReadRepository.pipe(
        Effect.flatMap((repository) =>
          Effect.gen(function* () {
            const base = yield* Replicache.makeWriteRepository(
              BillingAccountWorkflowsContract.table,
              repository,
            );

            const updateByBillingAccountId = (
              billingAccountId: BillingAccountWorkflowsContract.DataTransferObject["billingAccountId"],
              workflow: Partial<
                Omit<
                  BillingAccountWorkflowsContract.DataTransferObject,
                  "id" | "billingAccountId" | "tenantId"
                >
              >,
            ) =>
              repository.findAll.pipe(
                Effect.map(
                  Array.filterMap((prev) =>
                    Equal.equals(prev.billingAccountId, billingAccountId)
                      ? Option.some(
                          base.updateById(prev.id, {
                            ...prev,
                            ...workflow,
                          }),
                        )
                      : Option.none(),
                  ),
                ),
                Effect.flatMap(Effect.allWith({ concurrency: "unbounded" })),
              );

            const deleteByBillingAccountId = (
              billingAccountId: BillingAccountWorkflowsContract.DataTransferObject["billingAccountId"],
            ) =>
              repository.findAll.pipe(
                Effect.map(
                  Array.filterMap((workflow) =>
                    Equal.equals(workflow.billingAccountId, billingAccountId)
                      ? Option.some(base.deleteById(workflow.id))
                      : Option.none(),
                  ),
                ),
                Effect.flatMap(Effect.allWith({ concurrency: "unbounded" })),
              );

            return {
              ...base,
              updateByBillingAccountId,
              deleteByBillingAccountId,
            } as const;
          }),
        ),
      ),
    },
  ) {}
}

export namespace RoomWorkflows {
  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/workflows/client/RoomsReadRepository",
    {
      dependencies: [Replicache.ReadTransactionManager.Default],
      effect: Replicache.makeReadRepository(RoomWorkflowsContract.table),
    },
  ) {}

  export class WriteRepository extends Effect.Service<WriteRepository>()(
    "@printdesk/core/workflows/client/RoomsWriteRepository",
    {
      dependencies: [
        ReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: ReadRepository.pipe(
        Effect.flatMap((repository) =>
          Effect.gen(function* () {
            const base = yield* Replicache.makeWriteRepository(
              RoomWorkflowsContract.table,
              repository,
            );

            const updateByRoomId = (
              roomId: RoomWorkflowsContract.DataTransferObject["roomId"],
              workflow: Partial<
                Omit<
                  RoomWorkflowsContract.DataTransferObject,
                  "id" | "roomId" | "tenantId"
                >
              >,
            ) =>
              repository.findAll.pipe(
                Effect.map(
                  Array.filterMap((prev) =>
                    Equal.equals(prev.roomId, roomId)
                      ? Option.some(
                          base.updateById(prev.id, {
                            ...prev,
                            ...workflow,
                          }),
                        )
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
                  Array.filterMap((workflow) =>
                    Equal.equals(workflow.roomId, roomId)
                      ? Option.some(base.deleteById(workflow.id))
                      : Option.none(),
                  ),
                ),
                Effect.flatMap(Effect.allWith({ concurrency: "unbounded" })),
              );

            return { ...base, updateByRoomId, deleteByRoomId } as const;
          }),
        ),
      ),
    },
  ) {}
}

export namespace WorkflowStatuses {
  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/workflows/client/WorkflowStatusesReadRepository",
    {
      dependencies: [Replicache.ReadTransactionManager.Default],
      effect: Effect.gen(function* () {
        const base = yield* Replicache.makeReadRepository(
          WorkflowStatusesContract.table,
        );

        const findTailIndexByWorkflowId = (
          workflowId: WorkflowStatusesContract.DataTransferObject["workflowId"],
        ) =>
          base.findAll.pipe(
            Effect.map(
              Array.filter((option) => option.workflowId === workflowId),
            ),
            Effect.map(
              Array.sortWith(
                (status) => status.index,
                Order.reverse(Order.number),
              ),
            ),
            Effect.flatMap(Array.head),
            Effect.map(({ index }) => ({ index })),
          );

        const findSliceByWorkflowId = (
          start: WorkflowStatusesContract.DataTransferObject["index"],
          end: WorkflowStatusesContract.DataTransferObject["index"],
          workflowId: WorkflowStatusesContract.DataTransferObject["workflowId"],
        ) =>
          Effect.succeed(Number.sign(end - start) > 0).pipe(
            Effect.flatMap((isAscending) =>
              base.findAll.pipe(
                Effect.map(
                  Array.filter((status) =>
                    status.workflowId === workflowId && isAscending
                      ? status.index >= start && status.index <= end
                      : status.index <= start && status.index >= end,
                  ),
                ),
                Effect.map(
                  Array.sortWith(
                    (option) => option.index,
                    isAscending ? Order.number : Order.reverse(Order.number),
                  ),
                ),
              ),
            ),
          );

        return {
          ...base,
          findTailIndexByWorkflowId,
          findSliceByWorkflowId,
        } as const;
      }),
    },
  ) {}

  export class WriteRepository extends Effect.Service<WriteRepository>()(
    "@printdesk/core/workflows/client/WorkflowStatusesWriteRepository",
    {
      dependencies: [
        ReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: ReadRepository.pipe(
        Effect.flatMap((repository) =>
          Replicache.makeWriteRepository(
            WorkflowStatusesContract.table,
            repository,
          ),
        ),
      ),
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/workflows/client/WorkflowStatusesMutations",
    {
      accessors: true,
      dependencies: [ReadRepository.Default, WriteRepository.Default],
      effect: Effect.gen(function* () {
        const readRepository = yield* ReadRepository;
        const writeRepository = yield* WriteRepository;

        const append = DataAccessContract.makeMutation(
          WorkflowStatusesContract.append,
          Effect.succeed({
            makePolicy: () =>
              AccessControl.permission("workflow_statuses:create"),
            mutator: (workflowStatus, { tenantId }) =>
              readRepository
                .findTailIndexByWorkflowId(workflowStatus.workflowId)
                .pipe(
                  Effect.catchTag("NoSuchElementException", () =>
                    Effect.succeed({ index: -1 }),
                  ),
                  Effect.map(({ index }) => ++index),
                  Effect.flatMap((index) =>
                    writeRepository.create(
                      WorkflowStatusesContract.DataTransferObject.make({
                        ...workflowStatus,
                        index,
                        tenantId,
                      }),
                    ),
                  ),
                ),
          }),
        );

        const edit = DataAccessContract.makeMutation(
          WorkflowStatusesContract.edit,
          Effect.succeed({
            makePolicy: () =>
              AccessControl.permission("workflow_statuses:update"),
            mutator: ({ id, ...workflowStatus }) =>
              writeRepository.updateById(id, workflowStatus),
          }),
        );

        const reorder = DataAccessContract.makeMutation(
          WorkflowStatusesContract.reorder,
          Effect.succeed({
            makePolicy: () =>
              AccessControl.permission("workflow_statuses:update"),
            mutator: ({ oldIndex, newIndex, updatedAt, workflowId }) =>
              Effect.gen(function* () {
                const delta = newIndex - oldIndex;
                const shift = -Number.sign(delta);

                const slice = yield* readRepository.findSliceByWorkflowId(
                  oldIndex,
                  newIndex,
                  workflowId,
                );

                const sliceLength = slice.length;
                const absoluteDelta = Math.abs(delta);
                if (sliceLength !== absoluteDelta)
                  return yield* Effect.fail(
                    new WorkflowStatusesContract.InvalidReorderDeltaError({
                      sliceLength,
                      absoluteDelta,
                    }),
                  );

                return yield* Effect.all(
                  Array.map(slice, (option, sliceIndex) =>
                    writeRepository.updateById(option.id, {
                      index: option.index + (sliceIndex === 0 ? delta : shift),
                      updatedAt,
                    }),
                  ),
                );
              }),
          }),
        );

        const delete_ = DataAccessContract.makeMutation(
          WorkflowStatusesContract.delete_,
          Effect.succeed({
            makePolicy: () =>
              AccessControl.permission("workflow_statuses:delete"),
            mutator: ({ id, deletedAt }) =>
              writeRepository.updateById(id, { deletedAt }).pipe(
                AccessControl.enforce(
                  AccessControl.permission("workflow_statuses:read"),
                ),
                Effect.catchTag("AccessDeniedError", () =>
                  writeRepository.deleteById(id),
                ),
              ),
          }),
        );

        return { append, edit, reorder, delete: delete_ } as const;
      }),
    },
  ) {}
}
