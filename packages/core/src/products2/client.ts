import { Array, Effect, Equal, Option } from "effect";

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
          Effect.gen(function* () {
            const base = yield* Replicache.makeWriteRepository(
              ProductsContract.table,
              repository,
            );

            const updateByRoomId = (
              roomId: ProductsContract.DataTransferObject["roomId"],
              product: Partial<
                Omit<
                  ProductsContract.DataTransferObject,
                  "id" | "roomId" | "tenantId"
                >
              >,
            ) =>
              repository.findAll.pipe(
                Effect.map(
                  Array.filterMap((prev) =>
                    Equal.equals(prev.roomId, roomId)
                      ? Option.some(
                          base.updateById(prev.id, { ...prev, ...product }),
                        )
                      : Option.none(),
                  ),
                ),
                Effect.flatMap(Effect.allWith({ concurrency: "unbounded" })),
              );

            const deleteByRoomId = (
              roomId: ProductsContract.DataTransferObject["roomId"],
            ) =>
              repository.findAll.pipe(
                Effect.map(
                  Array.filterMap((product) =>
                    Equal.equals(product.roomId, roomId)
                      ? Option.some(base.deleteById(product.id))
                      : Option.none(),
                  ),
                ),
                Effect.flatMap(Effect.allWith({ concurrency: "unbounded" })),
              );

            return { ...base, updateByRoomId, deleteByRoomId };
          }),
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

        const edit = DataAccessContract.makeMutation(
          ProductsContract.edit,
          Effect.succeed({
            makePolicy: () => AccessControl.permission("products:update"),
            mutator: ({ id, ...product }) => repository.updateById(id, product),
          }),
        );

        const publish = DataAccessContract.makeMutation(
          ProductsContract.publish,
          Effect.succeed({
            makePolicy: () => AccessControl.permission("products:update"),
            mutator: ({ id, updatedAt }) =>
              repository.updateById(id, { status: "published", updatedAt }),
          }),
        );

        const draft = DataAccessContract.makeMutation(
          ProductsContract.draft,
          Effect.succeed({
            makePolicy: () => AccessControl.permission("products:update"),
            mutator: ({ id, updatedAt }) =>
              repository.updateById(id, { status: "draft", updatedAt }),
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

        return { create, edit, publish, draft, delete: delete_ } as const;
      }),
    },
  ) {}
}
