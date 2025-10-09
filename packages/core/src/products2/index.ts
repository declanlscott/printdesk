import {
  and,
  eq,
  getTableName,
  getViewName,
  inArray,
  not,
  notInArray,
} from "drizzle-orm";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import * as Predicate from "effect/Predicate";
import * as Struct from "effect/Struct";

import { AccessControl } from "../access-control2";
import { DataAccessContract } from "../data-access2/contract";
import { Database } from "../database2";
import { Events } from "../events2";
import { Permissions } from "../permissions2";
import { Replicache } from "../replicache2";
import { ReplicacheNotifier } from "../replicache2/notifier";
import { ReplicacheClientViewMetadataSchema } from "../replicache2/schemas";
import { Rooms } from "../rooms2";
import { ProductsContract } from "./contract";
import { ProductsSchema } from "./schema";

import type { InferInsertModel } from "drizzle-orm";

export namespace Products {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/products/Repository",
    {
      dependencies: [
        Database.TransactionManager.Default,
        Replicache.ClientViewMetadataQueryBuilder.Default,
      ],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = ProductsSchema.table.definition;
        const activeView = ProductsSchema.activeView;
        const activePublishedView = ProductsSchema.activePublishedView;

        const metadataQb = yield* Replicache.ClientViewMetadataQueryBuilder;
        const metadataTable =
          ReplicacheClientViewMetadataSchema.table.definition;

        const create = Effect.fn("Products.Repository.create")(
          (product: InferInsertModel<ProductsSchema.Table>) =>
            db
              .useTransaction((tx) =>
                tx.insert(table).values(product).returning(),
              )
              .pipe(
                Effect.flatMap(Array.head),
                Effect.catchTag("NoSuchElementException", Effect.die),
              ),
        );

        const findCreates = Effect.fn("Products.Repository.findCreates")(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: ProductsSchema.Row["tenantId"],
          ) =>
            metadataQb
              .creates(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getTableName(table)}_creates`)
                      .as(
                        tx
                          .select()
                          .from(table)
                          .where(eq(table.tenantId, tenantId)),
                      );

                    return tx
                      .with(cte)
                      .select()
                      .from(cte)
                      .where(
                        inArray(
                          cte.id,
                          tx.select({ id: cte.id }).from(cte).except(qb),
                        ),
                      );
                  }),
                ),
              ),
        );

        const findActiveCreates = Effect.fn(
          "Products.Repository.findActiveCreates",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: ProductsSchema.ActiveRow["tenantId"],
          ) =>
            metadataQb
              .creates(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getViewName(activeView)}_creates`)
                      .as(
                        tx
                          .select()
                          .from(activeView)
                          .where(eq(activeView.tenantId, tenantId)),
                      );

                    return tx
                      .with(cte)
                      .select()
                      .from(cte)
                      .where(
                        inArray(
                          cte.id,
                          tx.select({ id: cte.id }).from(cte).except(qb),
                        ),
                      );
                  }),
                ),
              ),
        );

        const findActivePublishedCreates = Effect.fn(
          "Products.Repository.findActivePublishedCreates",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: ProductsSchema.ActivePublishedRow["tenantId"],
          ) =>
            metadataQb
              .creates(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getViewName(activePublishedView)}_creates`)
                      .as(
                        tx
                          .select()
                          .from(activePublishedView)
                          .where(eq(activePublishedView.tenantId, tenantId)),
                      );

                    return tx
                      .with(cte)
                      .select()
                      .from(cte)
                      .where(
                        inArray(
                          cte.id,
                          tx.select({ id: cte.id }).from(cte).except(qb),
                        ),
                      );
                  }),
                ),
              ),
        );

        const findUpdates = Effect.fn("Products.Repository.findUpdates")(
          (
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: ProductsSchema.Row["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getTableName(table)}_updates`)
                      .as(
                        qb
                          .innerJoin(
                            table,
                            and(
                              eq(metadataTable.entityId, table.id),
                              not(
                                eq(metadataTable.entityVersion, table.version),
                              ),
                              eq(metadataTable.tenantId, table.tenantId),
                            ),
                          )
                          .where(eq(table.tenantId, tenantId)),
                      );

                    return tx
                      .with(cte)
                      .select(cte[getTableName(table)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActiveUpdates = Effect.fn(
          "Products.Repository.findActiveUpdates",
        )(
          (
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: ProductsSchema.ActiveRow["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getViewName(activeView)}_updates`)
                      .as(
                        qb
                          .innerJoin(
                            activeView,
                            and(
                              eq(metadataTable.entityId, activeView.id),
                              not(
                                eq(
                                  metadataTable.entityVersion,
                                  activeView.version,
                                ),
                              ),
                              eq(metadataTable.tenantId, activeView.tenantId),
                            ),
                          )
                          .where(eq(activeView.tenantId, tenantId)),
                      );

                    return tx
                      .with(cte)
                      .select(cte[getViewName(activeView)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActivePublishedUpdates = Effect.fn(
          "Products.Repository.findActivePublishedUpdates",
        )(
          (
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: ProductsSchema.ActivePublishedRow["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getViewName(activePublishedView)}_updates`)
                      .as(
                        qb
                          .innerJoin(
                            activePublishedView,
                            and(
                              eq(
                                metadataTable.entityId,
                                activePublishedView.id,
                              ),
                              not(
                                eq(
                                  metadataTable.entityVersion,
                                  activePublishedView.version,
                                ),
                              ),
                              eq(
                                metadataTable.tenantId,
                                activePublishedView.tenantId,
                              ),
                            ),
                          )
                          .where(eq(activePublishedView.tenantId, tenantId)),
                      );

                    return tx
                      .with(cte)
                      .select(cte[getViewName(activePublishedView)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findDeletes = Effect.fn("Products.Repository.findDeletes")(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: ProductsSchema.Row["tenantId"],
          ) =>
            metadataQb
              .deletes(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) =>
                    qb.except(
                      tx
                        .select({ id: table.id })
                        .from(table)
                        .where(eq(table.tenantId, tenantId)),
                    ),
                  ),
                ),
              ),
        );

        const findActiveDeletes = Effect.fn(
          "Products.Repository.findActiveDeletes",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: ProductsSchema.ActiveRow["tenantId"],
          ) =>
            metadataQb
              .deletes(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) =>
                    qb.except(
                      tx
                        .select({ id: activeView.id })
                        .from(activeView)
                        .where(eq(activeView.tenantId, tenantId)),
                    ),
                  ),
                ),
              ),
        );

        const findActivePublishedDeletes = Effect.fn(
          "Products.Repository.findActivePublishedDeletes",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: ProductsSchema.ActivePublishedRow["tenantId"],
          ) =>
            metadataQb
              .deletes(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) =>
                    qb.except(
                      tx
                        .select({ id: activePublishedView.id })
                        .from(activePublishedView)
                        .where(eq(activePublishedView.tenantId, tenantId)),
                    ),
                  ),
                ),
              ),
        );

        const findFastForward = Effect.fn(
          "Products.Repository.findFastForward",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: ProductsSchema.Row["tenantId"],
            excludeIds: Array<ProductsSchema.Row["id"]>,
          ) =>
            metadataQb
              .fastForward(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getTableName(table)}_fast_forward`)
                      .as(
                        qb
                          .innerJoin(
                            table,
                            and(
                              eq(metadataTable.entityId, table.id),
                              notInArray(table.id, excludeIds),
                            ),
                          )
                          .where(eq(table.tenantId, tenantId)),
                      );

                    return tx
                      .with(cte)
                      .select(cte[getTableName(table)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActiveFastForward = Effect.fn(
          "Products.Repository.findActiveFastForward",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: ProductsSchema.ActiveRow["tenantId"],
            excludeIds: Array<ProductsSchema.ActiveRow["id"]>,
          ) =>
            metadataQb
              .fastForward(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getViewName(activeView)}_fast_forward`)
                      .as(
                        qb
                          .innerJoin(
                            activeView,
                            and(
                              eq(metadataTable.entityId, activeView.id),
                              notInArray(activeView.id, excludeIds),
                            ),
                          )
                          .where(eq(activeView.tenantId, tenantId)),
                      );

                    return tx
                      .with(cte)
                      .select(cte[getViewName(activeView)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActivePublishedFastForward = Effect.fn(
          "Products.Repository.findActivePublishedFastForward",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: ProductsSchema.ActivePublishedRow["tenantId"],
            excludeIds: Array<ProductsSchema.ActivePublishedRow["id"]>,
          ) =>
            metadataQb
              .fastForward(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getViewName(activePublishedView)}_fast_forward`)
                      .as(
                        qb
                          .innerJoin(
                            activePublishedView,
                            and(
                              eq(
                                metadataTable.entityId,
                                activePublishedView.id,
                              ),
                              notInArray(activePublishedView.id, excludeIds),
                            ),
                          )
                          .where(eq(activePublishedView.tenantId, tenantId)),
                      );

                    return tx
                      .with(cte)
                      .select(cte[getViewName(activePublishedView)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findById = Effect.fn("Products.Repository.findById")(
          (
            id: ProductsSchema.Row["id"],
            tenantId: ProductsSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .select()
                  .from(table)
                  .where(and(eq(table.id, id), eq(table.tenantId, tenantId))),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const findByIdForUpdate = Effect.fn(
          "Products.Repository.findByIdForUpdate",
        )(
          (
            id: ProductsSchema.Row["id"],
            tenantId: ProductsSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .select()
                  .from(table)
                  .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
                  .for("update"),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const updateById = Effect.fn("Products.Repository.updateById")(
          (
            id: ProductsSchema.Row["id"],
            product: Partial<Omit<ProductsSchema.Row, "id" | "tenantId">>,
            tenantId: ProductsSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .update(table)
                  .set(product)
                  .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
                  .returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const updateByRoomId = Effect.fn("Products.Repository.updateByRoomId")(
          (
            roomId: ProductsSchema.Row["roomId"],
            product: Partial<
              Omit<ProductsSchema.Row, "id" | "roomId" | "tenantId">
            >,
            tenantId: ProductsSchema.Row["tenantId"],
          ) =>
            db.useTransaction((tx) =>
              tx
                .update(table)
                .set(product)
                .where(
                  and(eq(table.roomId, roomId), eq(table.tenantId, tenantId)),
                )
                .returning(),
            ),
        );

        return {
          create,
          findCreates,
          findActiveCreates,
          findActivePublishedCreates,
          findUpdates,
          findActiveUpdates,
          findActivePublishedUpdates,
          findDeletes,
          findActiveDeletes,
          findActivePublishedDeletes,
          findFastForward,
          findActiveFastForward,
          findActivePublishedFastForward,
          findById,
          findByIdForUpdate,
          updateById,
          updateByRoomId,
        } as const;
      }),
    },
  ) {}

  export class Policies extends Effect.Service<Policies>()(
    "@printdesk/core/products/Policies",
    {
      accessors: true,
      dependencies: [Repository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const canEdit = DataAccessContract.makePolicy(
          ProductsContract.canEdit,
          {
            make: Effect.fn("Products.Policies.canEdit.make")(({ id }) =>
              AccessControl.every(
                AccessControl.permission("products:update"),
                AccessControl.policy((principal) =>
                  repository
                    .findById(id, principal.tenantId)
                    .pipe(
                      Effect.map(Struct.get("deletedAt")),
                      Effect.map(Predicate.isNull),
                    ),
                ),
              ),
            ),
          },
        );

        const canDelete = DataAccessContract.makePolicy(
          ProductsContract.canDelete,
          {
            make: Effect.fn("Products.Policies.canDelete.make")(({ id }) =>
              AccessControl.policy((principal) =>
                repository
                  .findById(id, principal.tenantId)
                  .pipe(
                    Effect.map(Struct.get("deletedAt")),
                    Effect.map(Predicate.isNull),
                  ),
              ),
            ),
          },
        );

        const canRestore = DataAccessContract.makePolicy(
          ProductsContract.canRestore,
          {
            make: Effect.fn("Products.Policies.canRestore.make")(({ id }) =>
              AccessControl.policy((principal) =>
                repository
                  .findById(id, principal.tenantId)
                  .pipe(
                    Effect.map(Struct.get("deletedAt")),
                    Effect.map(Predicate.isNotNull),
                  ),
              ),
            ),
          },
        );

        return { canEdit, canDelete, canRestore } as const;
      }),
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/products/Mutations",
    {
      accessors: true,
      dependencies: [
        Repository.Default,
        Rooms.Repository.Default,
        Policies.Default,
        Permissions.Schemas.Default,
      ],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;
        const roomsRepository = yield* Rooms.Repository;

        const policies = yield* Policies;

        const notifier = yield* ReplicacheNotifier;
        const PullPermission = yield* Events.ReplicachePullPermission;

        const notifyCreate = (product: ProductsContract.DataTransferObject) =>
          Match.value(product).pipe(
            Match.when({ status: Match.is("published") }, () =>
              roomsRepository.findById(product.roomId, product.tenantId).pipe(
                Effect.map((room) =>
                  Match.value(room).pipe(
                    Match.whenAnd(
                      { deletedAt: Match.null },
                      { status: Match.is("published") },
                      () =>
                        Array.make(
                          PullPermission.make({
                            permission: "products:read",
                          }),
                          PullPermission.make({
                            permission: "active_products:read",
                          }),
                          PullPermission.make({
                            permission: "active_published_products:read",
                          }),
                        ),
                    ),
                    Match.orElse(() =>
                      Array.make(
                        PullPermission.make({ permission: "products:read" }),
                        PullPermission.make({
                          permission: "active_products:read",
                        }),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            Match.orElse(() =>
              Effect.succeed(
                Array.make(
                  PullPermission.make({ permission: "products:read" }),
                  PullPermission.make({ permission: "active_products:read" }),
                ),
              ),
            ),
            Effect.map(notifier.notify),
          );
        const notifyEdit = notifyCreate;

        const notifyPublish = (product: ProductsContract.DataTransferObject) =>
          roomsRepository.findById(product.roomId, product.tenantId).pipe(
            Effect.map((room) =>
              Match.value(room).pipe(
                Match.whenAnd(
                  { deletedAt: Match.null },
                  { status: Match.is("published") },
                  () =>
                    Array.make(
                      PullPermission.make({
                        permission: "products:read",
                      }),
                      PullPermission.make({
                        permission: "active_products:read",
                      }),
                      PullPermission.make({
                        permission: "active_published_products:read",
                      }),
                    ),
                ),
                Match.orElse(() =>
                  Array.make(
                    PullPermission.make({ permission: "products:read" }),
                    PullPermission.make({
                      permission: "active_products:read",
                    }),
                  ),
                ),
              ),
            ),
            Effect.map(notifier.notify),
          );
        const notifyDraft = notifyPublish;

        const notifyDelete = notifyCreate;
        const notifyRestore = notifyCreate;

        const create = DataAccessContract.makeMutation(
          ProductsContract.create,
          {
            makePolicy: Effect.fn("Products.Mutations.create.makePolicy")(() =>
              AccessControl.permission("products:create"),
            ),
            mutator: Effect.fn("Products.Mutations.create.mutator")(
              (product, { tenantId }) =>
                repository
                  .create({ ...product, tenantId })
                  .pipe(
                    Effect.map(Struct.omit("version")),
                    Effect.tap(notifyCreate),
                  ),
            ),
          },
        );

        const edit = DataAccessContract.makeMutation(ProductsContract.edit, {
          makePolicy: Effect.fn("Products.Mutations.edit.makePolicy")(
            ({ id }) =>
              AccessControl.every(
                AccessControl.permission("products:update"),
                policies.canEdit.make({ id }),
              ),
          ),
          mutator: Effect.fn("Products.Mutations.edit.mutator")(
            ({ id, ...product }, session) =>
              repository
                .updateById(id, product, session.tenantId)
                .pipe(
                  Effect.map(Struct.omit("version")),
                  Effect.tap(notifyEdit),
                ),
          ),
        });

        const publish = DataAccessContract.makeMutation(
          ProductsContract.publish,
          {
            makePolicy: Effect.fn("Products.Mutations.publish.makePolicy")(
              ({ id }) =>
                AccessControl.every(
                  AccessControl.permission("products:update"),
                  policies.canEdit.make({ id }),
                ),
            ),
            mutator: Effect.fn("Products.Mutations.publish.mutator")(
              ({ id, updatedAt }, session) =>
                repository.findByIdForUpdate(id, session.tenantId).pipe(
                  Effect.flatMap((prev) =>
                    repository
                      .updateById(
                        id,
                        {
                          status: "published",
                          config: ProductsContract.Configuration.make({
                            ...prev.config,
                            status: "published",
                          }),
                          updatedAt,
                        },
                        session.tenantId,
                      )
                      .pipe(
                        Effect.map(Struct.omit("version")),
                        Effect.tap(notifyPublish),
                      ),
                  ),
                ),
            ),
          },
        );

        const draft = DataAccessContract.makeMutation(ProductsContract.draft, {
          makePolicy: Effect.fn("Products.Mutations.draft.makePolicy")(
            ({ id }) =>
              AccessControl.every(
                AccessControl.permission("products:update"),
                policies.canEdit.make({ id }),
              ),
          ),
          mutator: Effect.fn("Products.Mutations.draft.mutator")(
            ({ id, updatedAt }, session) =>
              repository.findByIdForUpdate(id, session.tenantId).pipe(
                Effect.flatMap((prev) =>
                  repository
                    .updateById(
                      id,
                      {
                        status: "draft",
                        config: ProductsContract.Configuration.make({
                          ...prev.config,
                          status: "draft",
                        }),
                        updatedAt,
                      },
                      session.tenantId,
                    )
                    .pipe(
                      Effect.map(Struct.omit("version")),
                      Effect.tap(notifyDraft),
                    ),
                ),
              ),
          ),
        });

        const delete_ = DataAccessContract.makeMutation(
          ProductsContract.delete_,
          {
            makePolicy: Effect.fn("Products.Mutations.delete.makePolicy")(
              ({ id }) =>
                AccessControl.every(
                  AccessControl.permission("products:delete"),
                  policies.canDelete.make({ id }),
                ),
            ),
            mutator: Effect.fn("Products.Mutations.delete.mutator")(
              ({ id, deletedAt }, session) =>
                repository
                  .updateById(
                    id,
                    { deletedAt, status: "draft" },
                    session.tenantId,
                  )
                  .pipe(
                    Effect.map(Struct.omit("version")),
                    Effect.tap(notifyDelete),
                  ),
            ),
          },
        );

        const restore = DataAccessContract.makeMutation(
          ProductsContract.restore,
          {
            makePolicy: Effect.fn("Products.Mutations.restore.makePolicy")(
              ({ id }) =>
                AccessControl.every(
                  AccessControl.permission("products:delete"),
                  policies.canRestore.make({ id }),
                ),
            ),
            mutator: Effect.fn("Products.Mutations.restore.mutator")(
              ({ id }, session) =>
                repository
                  .updateById(id, { deletedAt: null }, session.tenantId)
                  .pipe(
                    Effect.map(Struct.omit("version")),
                    Effect.tap(notifyRestore),
                  ),
            ),
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
