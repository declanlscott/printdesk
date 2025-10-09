import { Array, Effect, Equal, Option, Predicate, Struct } from "effect";

import { AccessControl } from "../access-control2";
import { DataAccessContract } from "../data-access2/contract";
import { Models } from "../models2";
import { Replicache } from "../replicache2/client";
import { DeliveryOptionsContract } from "./contract";

export namespace DeliveryOptions {
  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/delivery-options/client/ReadRepository",
    {
      dependencies: [
        Models.SyncTables.Default,
        Replicache.ReadTransactionManager.Default,
      ],
      effect: Models.SyncTables.deliveryOptions.pipe(
        Effect.flatMap(Replicache.makeReadRepository),
      ),
    },
  ) {}

  export class WriteRepository extends Effect.Service<WriteRepository>()(
    "@printdesk/core/delivery-options/client/WriteRepository",
    {
      dependencies: [
        Models.SyncTables.Default,
        ReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: Effect.gen(function* () {
        const table = yield* Models.SyncTables.deliveryOptions;
        const repository = yield* ReadRepository;
        const base = yield* Replicache.makeWriteRepository(table, repository);

        const updateByRoomId = (
          roomId: DeliveryOptionsContract.DataTransferObject["roomId"],
          announcement: Partial<
            Omit<
              DeliveryOptionsContract.DataTransferObject,
              "id" | "roomId" | "tenantId"
            >
          >,
        ) =>
          repository.findAll.pipe(
            Effect.map(
              Array.filterMap((o) =>
                Equal.equals(o.roomId, roomId)
                  ? Option.some(base.updateById(o.id, () => announcement))
                  : Option.none(),
              ),
            ),
            Effect.flatMap(Effect.allWith({ concurrency: "unbounded" })),
          );

        const deleteByRoomId = (
          roomId: DeliveryOptionsContract.DataTransferObject["roomId"],
        ) =>
          repository.findAll.pipe(
            Effect.map(
              Array.filterMap((o) =>
                Equal.equals(o.roomId, roomId)
                  ? Option.some(base.deleteById(o.id))
                  : Option.none(),
              ),
            ),
            Effect.flatMap(Effect.allWith({ concurrency: "unbounded" })),
          );

        return { ...base, updateByRoomId, deleteByRoomId } as const;
      }),
    },
  ) {}

  export class Policies extends Effect.Service<Policies>()(
    "@printdesk/core/delivery-options/Policies",
    {
      dependencies: [ReadRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* ReadRepository;

        const canEdit = DataAccessContract.makePolicy(
          DeliveryOptionsContract.canEdit,
          {
            make: ({ id }) =>
              AccessControl.policy(() =>
                repository
                  .findById(id)
                  .pipe(
                    Effect.map(Struct.get("deletedAt")),
                    Effect.map(Predicate.isNull),
                  ),
              ),
          },
        );

        const canDelete = DataAccessContract.makePolicy(
          DeliveryOptionsContract.canDelete,
          { make: canEdit.make },
        );

        const canRestore = DataAccessContract.makePolicy(
          DeliveryOptionsContract.canRestore,
          {
            make: ({ id }) =>
              AccessControl.policy(() =>
                repository
                  .findById(id)
                  .pipe(
                    Effect.map(Struct.get("deletedAt")),
                    Effect.map(Predicate.isNotNull),
                  ),
              ),
          },
        );

        return { canEdit, canDelete, canRestore } as const;
      }),
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/delivery-options/client/Mutations",
    {
      accessors: true,
      dependencies: [WriteRepository.Default, Policies.Default],
      effect: Effect.gen(function* () {
        const repository = yield* WriteRepository;

        const policies = yield* Policies;

        const create = DataAccessContract.makeMutation(
          DeliveryOptionsContract.create,
          {
            makePolicy: () =>
              AccessControl.permission("delivery_options:create"),
            mutator: (deliveryOption, { tenantId }) =>
              repository.create(
                DeliveryOptionsContract.DataTransferObject.make({
                  ...deliveryOption,
                  tenantId,
                }),
              ),
          },
        );

        const edit = DataAccessContract.makeMutation(
          DeliveryOptionsContract.edit,
          {
            makePolicy: ({ id }) =>
              AccessControl.every(
                AccessControl.permission("delivery_options:update"),
                policies.canEdit.make({ id }),
              ),
            mutator: ({ id, ...deliveryOption }) =>
              repository.updateById(id, () => deliveryOption),
          },
        );

        const delete_ = DataAccessContract.makeMutation(
          DeliveryOptionsContract.delete_,
          {
            makePolicy: ({ id }) =>
              AccessControl.every(
                AccessControl.permission("delivery_options:delete"),
                policies.canDelete.make({ id }),
              ),
            mutator: ({ id, deletedAt }) =>
              repository
                .updateById(id, () => ({ deletedAt }))
                .pipe(
                  AccessControl.enforce(
                    AccessControl.permission("delivery_options:read"),
                  ),
                  Effect.catchTag("AccessDeniedError", () =>
                    repository.deleteById(id),
                  ),
                ),
          },
        );

        const restore = DataAccessContract.makeMutation(
          DeliveryOptionsContract.restore,
          {
            makePolicy: ({ id }) =>
              AccessControl.every(
                AccessControl.permission("delivery_options:delete"),
                policies.canRestore.make({ id }),
              ),
            mutator: ({ id }) =>
              repository
                .updateById(id, () => ({ deletedAt: null }))
                .pipe(
                  AccessControl.enforce(
                    AccessControl.permission("delivery_options:read"),
                  ),
                ),
          },
        );

        return { create, edit, delete: delete_, restore } as const;
      }),
    },
  ) {}
}
