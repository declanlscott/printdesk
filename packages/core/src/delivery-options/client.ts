import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as Struct from "effect/Struct";

import { AccessControl } from "../access-control";
import { Models } from "../models";
import { MutationsContract } from "../mutations/contract";
import { PoliciesContract } from "../policies/contract";
import { Replicache } from "../replicache/client";
import { DeliveryOptionsContract } from "./contract";

export namespace DeliveryOptions {
  const table = Models.syncTables[DeliveryOptionsContract.tableName];

  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/delivery-options/client/ReadRepository",
    {
      dependencies: [Replicache.ReadTransactionManager.Default],
      effect: Replicache.makeReadRepository(table),
    },
  ) {}

  export class WriteRepository extends Effect.Service<WriteRepository>()(
    "@printdesk/core/delivery-options/client/WriteRepository",
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
          roomId: DeliveryOptionsContract.DataTransferObject["roomId"],
          deliveryOption: Partial<
            Omit<
              DeliveryOptionsContract.DataTransferObject,
              "id" | "roomId" | "tenantId"
            >
          >,
        ) =>
          repository
            .findWhere(
              Array.filterMap((o) =>
                o.roomId === roomId
                  ? Option.some(base.updateById(o.id, () => deliveryOption))
                  : Option.none(),
              ),
            )
            .pipe(Effect.flatMap(Effect.allWith({ concurrency: "unbounded" })));

        const deleteByRoomId = (
          roomId: DeliveryOptionsContract.DataTransferObject["roomId"],
        ) =>
          repository
            .findWhere(
              Array.filterMap((o) =>
                o.roomId === roomId
                  ? Option.some(base.deleteById(o.id))
                  : Option.none(),
              ),
            )
            .pipe(Effect.flatMap(Effect.allWith({ concurrency: "unbounded" })));

        return { ...base, updateByRoomId, deleteByRoomId } as const;
      }),
    },
  ) {}

  export class Policies extends Effect.Service<Policies>()(
    "@printdesk/core/delivery-options/Policies",
    {
      accessors: true,
      dependencies: [ReadRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* ReadRepository;

        const canEdit = PoliciesContract.makePolicy(
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

        const canDelete = PoliciesContract.makePolicy(
          DeliveryOptionsContract.canDelete,
          { make: canEdit.make },
        );

        const canRestore = PoliciesContract.makePolicy(
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

        const create = MutationsContract.makeMutation(
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

        const edit = MutationsContract.makeMutation(
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

        const delete_ = MutationsContract.makeMutation(
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

        const restore = MutationsContract.makeMutation(
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
