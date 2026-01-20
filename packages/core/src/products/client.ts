import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as Struct from "effect/Struct";

import { AccessControl } from "../access-control";
import { Models } from "../models";
import { MutationsContract } from "../mutations/contract";
import { PoliciesContract } from "../policies/contract";
import { Replicache } from "../replicache/client";
import { ProductsContract } from "./contract";

export namespace Products {
  const Table = Models.syncTables[ProductsContract.Table.name];

  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/products/client/ReadRepository",
    {
      dependencies: [Replicache.ReadTransactionManager.Default],
      effect: Replicache.makeReadRepository(Table),
    },
  ) {}

  export class WriteRepository extends Effect.Service<WriteRepository>()(
    "@printdesk/core/products/client/WriteRepository",
    {
      accessors: true,
      dependencies: [
        ReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: Effect.gen(function* () {
        const repository = yield* ReadRepository;
        const base = yield* Replicache.makeWriteRepository(Table, repository);

        const updateByRoomId = (
          roomId: (typeof ProductsContract.Table.DataTransferObject.Type)["roomId"],
          product: Partial<
            Omit<
              typeof ProductsContract.Table.DataTransferObject.Type,
              "id" | "roomId" | "tenantId"
            >
          >,
        ) =>
          repository
            .findWhere((p) =>
              p.roomId === roomId
                ? Option.some(base.updateById(p.id, () => product))
                : Option.none(),
            )
            .pipe(Effect.flatMap(Effect.allWith({ concurrency: "unbounded" })));

        const deleteByRoomId = (
          roomId: (typeof ProductsContract.Table.DataTransferObject.Type)["roomId"],
        ) =>
          repository
            .findWhere((p) =>
              p.roomId === roomId
                ? Option.some(base.deleteById(p.id))
                : Option.none(),
            )
            .pipe(Effect.flatMap(Effect.allWith({ concurrency: "unbounded" })));

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

        const canEdit = PoliciesContract.makePolicy(ProductsContract.canEdit, {
          make: ({ id }) =>
            repository.findById(id).pipe(
              Effect.map(Struct.get("deletedAt")),
              Effect.map(Predicate.isNull),
              AccessControl.policy({
                name: ProductsContract.Table.name,
                id,
              }),
            ),
        });

        const canDelete = PoliciesContract.makePolicy(
          ProductsContract.canDelete,
          { make: canEdit.make },
        );

        const canRestore = PoliciesContract.makePolicy(
          ProductsContract.canRestore,
          {
            make: ({ id }) =>
              repository.findById(id).pipe(
                Effect.map(Struct.get("deletedAt")),
                Effect.map(Predicate.isNotNull),
                AccessControl.policy({
                  name: ProductsContract.Table.name,
                  id,
                }),
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

        const create = MutationsContract.makeMutation(ProductsContract.create, {
          makePolicy: () => AccessControl.permission("products:create"),
          mutator: (product, { tenantId }) =>
            repository.create(
              new ProductsContract.Table.DataTransferObject({
                ...product,
                tenantId,
              }),
            ),
        });

        const edit = MutationsContract.makeMutation(ProductsContract.edit, {
          makePolicy: ({ id }) =>
            AccessControl.every(
              AccessControl.permission("products:update"),
              policies.canEdit.make({ id }),
            ),
          mutator: ({ id, ...product }) =>
            repository.updateById(id, () => product),
        });

        const publish = MutationsContract.makeMutation(
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

        const draft = MutationsContract.makeMutation(ProductsContract.draft, {
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

        const delete_ = MutationsContract.makeMutation(
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

        const restore = MutationsContract.makeMutation(
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
