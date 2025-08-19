import { Array, Effect, Option, Schema } from "effect";

import { AccessControl } from "../access-control2";
import { DataAccessContract } from "../data-access2/contract";
import { Replicache } from "../replicache2/client";
import {
  DeliveryOptionsContract,
  RoomsContract,
  WorkflowsContract,
} from "./contracts";

import type { WorkflowStatus } from "./sql";

export namespace Rooms {
  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/rooms/client/ReadRepository",
    {
      dependencies: [Replicache.ReadTransactionManager.Default],
      effect: Replicache.makeReadRepository(RoomsContract.table),
    },
  ) {}

  export class WriteRepository extends Effect.Service<WriteRepository>()(
    "@printdesk/core/rooms/client/WriteRepository",
    {
      dependencies: [
        ReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: ReadRepository.pipe(
        Effect.flatMap((repository) =>
          Replicache.makeWriteRepository(RoomsContract.table, repository),
        ),
      ),
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/rooms/client/Mutations",
    {
      accessors: true,
      dependencies: [WriteRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* WriteRepository;

        const create = DataAccessContract.makeMutation(
          RoomsContract.create,
          Effect.succeed({
            makePolicy: () => AccessControl.permission("rooms:create"),
            mutator: (room, { tenantId }) =>
              repository.create(
                RoomsContract.table.Schema.make({ ...room, tenantId }),
              ),
          }),
        );

        const update = DataAccessContract.makeMutation(
          RoomsContract.update,
          Effect.succeed({
            makePolicy: () => AccessControl.permission("rooms:update"),
            mutator: ({ id, ...room }) => repository.updateById(id, room),
          }),
        );

        const delete_ = DataAccessContract.makeMutation(
          RoomsContract.delete_,
          Effect.succeed({
            makePolicy: () => AccessControl.permission("rooms:delete"),
            mutator: ({ id }) => repository.deleteById(id),
          }),
        );

        const restore = DataAccessContract.makeMutation(
          RoomsContract.restore,
          Effect.succeed({
            makePolicy: () => AccessControl.permission("rooms:delete"),
            mutator: ({ id }) => repository.updateById(id, { deletedAt: null }),
          }),
        );

        return { create, update, delete: delete_, restore } as const;
      }),
    },
  ) {}

  export class WorkflowReadRepository extends Effect.Service<WorkflowReadRepository>()(
    "@printdesk/core/rooms/client/WorkflowReadRepository",
    {
      dependencies: [Replicache.ReadTransactionManager.Default],
      effect: Replicache.makeReadRepository(WorkflowsContract.table),
    },
  ) {}

  export class WorkflowWriteRepository extends Effect.Service<WorkflowWriteRepository>()(
    "@printdesk/core/rooms/client/WorkflowWriteRepository",
    {
      dependencies: [
        WorkflowReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: WorkflowReadRepository.pipe(
        Effect.flatMap((repository) =>
          Effect.gen(function* () {
            const base = yield* Replicache.makeWriteRepository(
              WorkflowsContract.table,
              repository,
            );
            const { set } = yield* Replicache.WriteTransactionManager;

            const upsert = (
              workflow: typeof WorkflowsContract.Workflow.Type,
              roomId: WorkflowStatus["roomId"],
              tenantId: WorkflowStatus["tenantId"],
            ) =>
              Effect.all([
                ...workflow.map((status, index) =>
                  set(
                    WorkflowsContract.table,
                    status.id,
                    WorkflowsContract.table.Schema.make({
                      ...status,
                      index,
                      roomId,
                      tenantId,
                    }),
                  ),
                ),
              ]).pipe(
                Effect.map(
                  Array.filterMap((status) =>
                    status.type !== "Review"
                      ? Option.some(
                          status as WorkflowStatus & {
                            readonly type: Exclude<
                              WorkflowStatus["type"],
                              "Review"
                            >;
                          },
                        )
                      : Option.none(),
                  ),
                ),
                Effect.flatMap(Schema.decode(WorkflowsContract.Workflow)),
              );

            return { ...base, upsert };
          }),
        ),
      ),
    },
  ) {}

  export class WorkflowMutations extends Effect.Service<WorkflowMutations>()(
    "@printdesk/core/rooms/client/WorkflowMutations",
    {
      accessors: true,
      dependencies: [WorkflowWriteRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* WorkflowWriteRepository;

        const set = DataAccessContract.makeMutation(
          WorkflowsContract.set,
          Effect.succeed({
            makePolicy: () =>
              AccessControl.permission("workflow_statuses:create"),
            mutator: ({ workflow, roomId }, session) =>
              repository.upsert(workflow, roomId, session.tenantId),
          }),
        );

        return { set } as const;
      }),
    },
  ) {}

  export class DeliveryOptionsReadRepository extends Effect.Service<DeliveryOptionsReadRepository>()(
    "@printdesk/core/rooms/client/DeliveryOptionsReadRepository",
    {
      dependencies: [Replicache.ReadTransactionManager.Default],
      effect: Replicache.makeReadRepository(DeliveryOptionsContract.table),
    },
  ) {}

  export class DeliveryOptionsWriteRepository extends Effect.Service<DeliveryOptionsWriteRepository>()(
    "@printdesk/core/rooms/client/DeliveryOptionsWriteRepository",
    {
      dependencies: [
        DeliveryOptionsReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: DeliveryOptionsReadRepository.pipe(
        Effect.flatMap((repository) =>
          Effect.gen(function* () {
            const base = yield* Replicache.makeWriteRepository(
              DeliveryOptionsContract.table,
              repository,
            );
            const { set } = yield* Replicache.WriteTransactionManager;

            const upsert = (
              deliveryOptions: typeof DeliveryOptionsContract.DeliveryOptions.Type,
              roomId: WorkflowStatus["roomId"],
              tenantId: WorkflowStatus["tenantId"],
            ) =>
              Effect.all([
                ...deliveryOptions.map((option, index) =>
                  set(
                    DeliveryOptionsContract.table,
                    option.id,
                    DeliveryOptionsContract.table.Schema.make({
                      ...option,
                      index,
                      roomId,
                      tenantId,
                    }),
                  ),
                ),
              ]).pipe(
                Effect.flatMap(
                  Schema.decode(DeliveryOptionsContract.DeliveryOptions),
                ),
              );

            return { ...base, upsert } as const;
          }),
        ),
      ),
    },
  ) {}

  export class DeliveryOptionsMutations extends Effect.Service<DeliveryOptionsMutations>()(
    "@printdesk/core/rooms/client/DeliveryOptionsMutations",
    {
      accessors: true,
      dependencies: [DeliveryOptionsWriteRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* DeliveryOptionsWriteRepository;

        const set = DataAccessContract.makeMutation(
          DeliveryOptionsContract.set,
          Effect.succeed({
            makePolicy: () =>
              AccessControl.permission("delivery_options:create"),
            mutator: ({ options, roomId }, session) =>
              repository.upsert(options, roomId, session.tenantId),
          }),
        );

        return { set } as const;
      }),
    },
  ) {}
}
