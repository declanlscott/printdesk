import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as Struct from "effect/Struct";

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

  export class Policies extends Effect.Service<Policies>()(
    "@printdesk/core/products/client/Policies",
    {
      accessors: true,
      dependencies: [ReadRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* ReadRepository;

        const canEdit = DataAccessContract.makePolicy(
          ProductsContract.canEdit,
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
          ProductsContract.canDelete,
          { make: canEdit.make },
        );

        const canRestore = DataAccessContract.makePolicy(
          ProductsContract.canRestore,
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
    "@printdesk/core/products/client/Mutations",
    {
      accessors: true,
      dependencies: [WriteRepository.Default, Policies.Default],
      effect: Effect.gen(function* () {
        const repository = yield* WriteRepository;

        const policies = yield* Policies;

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
          makePolicy: ({ id }) =>
            AccessControl.every(
              AccessControl.permission("products:update"),
              policies.canEdit.make({ id }),
            ),
          mutator: ({ id, ...product }) =>
            repository.updateById(id, () => product),
        });

        const publish = DataAccessContract.makeMutation(
          ProductsContract.publish,
          {
            makePolicy: ({ id }) =>
              AccessControl.every(
                AccessControl.permission("products:update"),
                policies.canEdit.make({ id }),
              ),
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
          makePolicy: ({ id }) =>
            AccessControl.every(
              AccessControl.permission("products:update"),
              policies.canEdit.make({ id }),
            ),
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
            makePolicy: ({ id }) =>
              AccessControl.every(
                AccessControl.permission("products:delete"),
                policies.canDelete.make({ id }),
              ),
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

        const restore = DataAccessContract.makeMutation(
          ProductsContract.restore,
          {
            makePolicy: ({ id }) =>
              AccessControl.every(
                AccessControl.permission("products:delete"),
                policies.canRestore.make({ id }),
              ),
            mutator: ({ id }) =>
              repository.updateById(id, () => ({ deletedAt: null })),
          },
        );

        return {
          create,
          edit,
          publish,
          draft,
          delete: delete_,
          restore,
        } as const;
      }),
    },
  ) {}
}
