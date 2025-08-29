import { Array, Effect, Equal, Option } from "effect";

import { Replicache } from "../replicache2/client";
import {
  BillingAccountWorkflowsContract,
  RoomWorkflowsContract,
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
