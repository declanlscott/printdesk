import { Effect } from "effect";

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
      effect: Effect.all([
        Models.SyncTables.deliveryOptions,
        ReadRepository,
      ]).pipe(
        Effect.flatMap((args) => Replicache.makeWriteRepository(...args)),
      ),
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/delivery-options/client/Mutations",
    {
      accessors: true,
      dependencies: [WriteRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* WriteRepository;

        const create = DataAccessContract.makeMutation(
          DeliveryOptionsContract.create,
          Effect.succeed({
            makePolicy: () =>
              AccessControl.permission("delivery_options:create"),
            mutator: (deliveryOption, { tenantId }) =>
              repository.create(
                DeliveryOptionsContract.DataTransferObject.make({
                  ...deliveryOption,
                  tenantId,
                }),
              ),
          }),
        );

        const update = DataAccessContract.makeMutation(
          DeliveryOptionsContract.update,
          Effect.succeed({
            makePolicy: () =>
              AccessControl.permission("delivery_options:update"),
            mutator: ({ id, ...deliveryOption }) =>
              repository.updateById(id, () => deliveryOption),
          }),
        );

        const delete_ = DataAccessContract.makeMutation(
          DeliveryOptionsContract.delete_,
          Effect.succeed({
            makePolicy: () =>
              AccessControl.permission("delivery_options:delete"),
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
          }),
        );

        return { create, update, delete: delete_ } as const;
      }),
    },
  ) {}
}
