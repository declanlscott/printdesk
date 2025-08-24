import { Effect } from "effect";

import { AccessControl } from "../access-control2";
import { DataAccessContract } from "../data-access2/contract";
import { Replicache } from "../replicache2/client";
import { ProductsContract } from "./contract";

export namespace Products {
  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/products/client/ReadRepository",
    {
      dependencies: [Replicache.ReadTransactionManager.Default],
      effect: Replicache.makeReadRepository(ProductsContract.table),
    },
  ) {}

  export class WriteRepository extends Effect.Service<WriteRepository>()(
    "@printdesk/core/products/client/WriteRepository",
    {
      dependencies: [
        ReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: ReadRepository.pipe(
        Effect.flatMap((repository) =>
          Replicache.makeWriteRepository(ProductsContract.table, repository),
        ),
      ),
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/products/client/Mutations",
    {
      accessors: true,
      dependencies: [WriteRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* WriteRepository;

        const create = DataAccessContract.makeMutation(
          ProductsContract.create,
          Effect.succeed({
            makePolicy: () => AccessControl.permission("products:create"),
            mutator: (product, { tenantId }) =>
              repository.create(
                ProductsContract.DataTransferObject.make({
                  ...product,
                  tenantId,
                }),
              ),
          }),
        );

        const update = DataAccessContract.makeMutation(
          ProductsContract.update,
          Effect.succeed({
            makePolicy: () => AccessControl.permission("products:update"),
            mutator: ({ id, ...product }) => repository.updateById(id, product),
          }),
        );

        const delete_ = DataAccessContract.makeMutation(
          ProductsContract.delete_,
          Effect.succeed({
            makePolicy: () => AccessControl.permission("products:delete"),
            mutator: ({ id, deletedAt }) =>
              repository.updateById(id, { deletedAt }).pipe(
                AccessControl.enforce(
                  AccessControl.permission("products:read"),
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
