import { Array, Effect, Equal, Option } from "effect";

import { AccessControl } from "../access-control2";
import { DataAccessContract } from "../data-access2/contract";
import { Models } from "../models2";
import { Replicache } from "../replicache2/client";
import { ProductsContract } from "./contract";

export namespace Products {
  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/products/client/ReadRepository",
    {
      dependencies: [
        Models.SyncTables.Default,
        Replicache.ReadTransactionManager.Default,
      ],
      effect: Models.SyncTables.products.pipe(
        Effect.flatMap(Replicache.makeReadRepository),
      ),
    },
  ) {}

  export class WriteRepository extends Effect.Service<WriteRepository>()(
    "@printdesk/core/products/client/WriteRepository",
    {
      dependencies: [
        Models.SyncTables.Default,
        ReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: Effect.gen(function* () {
        const table = yield* Models.SyncTables.products;
        const repository = yield* ReadRepository;
        const base = yield* Replicache.makeWriteRepository(table, repository);

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
              Array.filterMap((p) =>
                Equal.equals(p.roomId, roomId)
                  ? Option.some(base.updateById(p.id, () => product))
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
              Array.filterMap((p) =>
                Equal.equals(p.roomId, roomId)
                  ? Option.some(base.deleteById(p.id))
                  : Option.none(),
              ),
            ),
            Effect.flatMap(Effect.allWith({ concurrency: "unbounded" })),
          );

        return { ...base, updateByRoomId, deleteByRoomId } as const;
      }),
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
          {
            makePolicy: () => AccessControl.permission("products:create"),
            mutator: (product, { tenantId }) =>
              repository.create(
                ProductsContract.DataTransferObject.make({
                  ...product,
                  tenantId,
                }),
              ),
          },
        );

        const edit = DataAccessContract.makeMutation(ProductsContract.edit, {
          makePolicy: () => AccessControl.permission("products:update"),
          mutator: ({ id, ...product }) =>
            repository.updateById(id, () => product),
        });

        const publish = DataAccessContract.makeMutation(
          ProductsContract.publish,
          {
            makePolicy: () => AccessControl.permission("products:update"),
            mutator: ({ id, updatedAt }) =>
              repository.updateById(id, ({ config }) => ({
                status: "published",
                config: ProductsContract.Configuration.make({
                  ...config,
                  status: "published",
                }),
                updatedAt,
              })),
          },
        );

        const draft = DataAccessContract.makeMutation(ProductsContract.draft, {
          makePolicy: () => AccessControl.permission("products:update"),
          mutator: ({ id, updatedAt }) =>
            repository.updateById(id, ({ config }) => ({
              status: "draft",
              config: ProductsContract.Configuration.make({
                ...config,
                status: "draft",
              }),
              updatedAt,
            })),
        });

        const delete_ = DataAccessContract.makeMutation(
          ProductsContract.delete_,
          {
            makePolicy: () => AccessControl.permission("products:delete"),
            mutator: ({ id, deletedAt }) =>
              repository
                .updateById(id, () => ({ deletedAt }))
                .pipe(
                  AccessControl.enforce(
                    AccessControl.permission("products:read"),
                  ),
                  Effect.catchTag("AccessDeniedError", () =>
                    repository.deleteById(id),
                  ),
                ),
          },
        );

        return { create, edit, publish, draft, delete: delete_ } as const;
      }),
    },
  ) {}
}
