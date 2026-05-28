import { and, eq, getViewName, inArray, not, notInArray } from "drizzle-orm";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { DeliveryOptionsRepository } from ".";
import { Database } from "../../database";
import { replicacheClientViewEntries } from "../../replicache/sql";
import { SyncQueryBuilder } from "../../sync/query-builder";
import {
  activeDeliveryOptionsView,
  activePublishedRoomDeliveryOptionsView,
  deliveryOptions,
} from "../sql";

import type { InferInsertModel } from "drizzle-orm";
import type { ReplicacheClientView } from "../../replicache/sql";
import type {
  ActiveDeliveryOption,
  ActivePublishedRoomDeliveryOption,
  DeliveryOption,
  DeliveryOptionsTable,
} from "../sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const db = yield* Database;
  const table = deliveryOptions.table;
  const activeView = activeDeliveryOptionsView;
  const activePublishedRoomView = activePublishedRoomDeliveryOptionsView;

  const entriesQueryBuilder = yield* SyncQueryBuilder;
  const entriesTable = replicacheClientViewEntries.table;

  const create = Effect.fn("DeliveryOptions.Repository.create")(
    (value: InferInsertModel<DeliveryOptionsTable>) =>
      db
        .useTransaction((tx) => tx.insert(table).values(value).returning())
        .pipe(
          Effect.map(Array.head),
          Effect.flatMap(Effect.fromOption),
          Effect.catchTag("NoSuchElementError", Effect.die),
        ),
  );

  const findCreates = Effect.fn("DeliveryOptions.Repository.findCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(deliveryOptions.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${deliveryOptions.name}_creates`)
              .as(tx.select().from(table).where(eq(table.tenantId, clientView.tenantId)));

            return tx
              .with(cte)
              .select()
              .from(cte)
              .where(inArray(cte.id, tx.select({ id: cte.id }).from(cte).except(qb)));
          }),
        ),
      ),
  );

  const findActiveCreates = Effect.fn("DeliveryOptions.Repository.findActiveCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(deliveryOptions.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activeView)}_creates`)
              .as(tx.select().from(activeView).where(eq(activeView.tenantId, clientView.tenantId)));

            return tx
              .with(cte)
              .select()
              .from(cte)
              .where(inArray(cte.id, tx.select({ id: cte.id }).from(cte).except(qb)));
          }),
        ),
      ),
  );

  const findActivePublishedRoomCreates = Effect.fn(
    "DeliveryOptions.Repository.findActivePublishedRoomCreates",
  )((clientView: ReplicacheClientView) =>
    entriesQueryBuilder.creates(deliveryOptions.name, clientView).pipe(
      Effect.flatMap((qb) =>
        db.useTransaction((tx) => {
          const cte = tx
            .$with(`${getViewName(activePublishedRoomView)}_creates`)
            .as(
              tx
                .select()
                .from(activePublishedRoomView)
                .where(eq(activePublishedRoomView.tenantId, clientView.tenantId)),
            );

          return tx
            .with(cte)
            .select()
            .from(cte)
            .where(inArray(cte.id, tx.select({ id: cte.id }).from(cte).except(qb)));
        }),
      ),
    ),
  );

  const findUpdates = Effect.fn("DeliveryOptions.Repository.findUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(deliveryOptions.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${deliveryOptions.name}_updates`)
              .as(
                qb
                  .innerJoin(
                    table,
                    and(
                      eq(entriesTable.entityId, table.id),
                      not(eq(entriesTable.entityVersion, table.version)),
                      eq(entriesTable.tenantId, table.tenantId),
                    ),
                  )
                  .where(eq(table.tenantId, clientView.tenantId)),
              );

            return tx.with(cte).select(cte[deliveryOptions.name]).from(cte);
          }),
        ),
      ),
  );

  const findActiveUpdates = Effect.fn("DeliveryOptions.Repository.findActiveUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(deliveryOptions.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activeView)}_updates`)
              .as(
                qb
                  .innerJoin(
                    activeView,
                    and(
                      eq(entriesTable.entityId, activeView.id),
                      not(eq(entriesTable.entityVersion, activeView.version)),
                      eq(entriesTable.tenantId, activeView.tenantId),
                    ),
                  )
                  .where(eq(activeView.tenantId, clientView.tenantId)),
              );

            return tx.with(cte).select(cte[getViewName(activeView)]).from(cte);
          }),
        ),
      ),
  );

  const findActivePublishedRoomUpdates = Effect.fn(
    "DeliveryOptions.Repository.findActivePublishedRoomUpdates",
  )((clientView: ReplicacheClientView) =>
    entriesQueryBuilder.updates(deliveryOptions.name, clientView).pipe(
      Effect.flatMap((qb) =>
        db.useTransaction((tx) => {
          const cte = tx
            .$with(`${getViewName(activePublishedRoomView)}_updates`)
            .as(
              qb
                .innerJoin(
                  activePublishedRoomView,
                  and(
                    eq(entriesTable.entityId, activePublishedRoomView.id),
                    not(eq(entriesTable.entityVersion, activePublishedRoomView.version)),
                    eq(entriesTable.tenantId, activePublishedRoomView.tenantId),
                  ),
                )
                .where(eq(activePublishedRoomView.tenantId, clientView.tenantId)),
            );

          return tx.with(cte).select(cte[getViewName(activePublishedRoomView)]).from(cte);
        }),
      ),
    ),
  );

  const findDeletes = Effect.fn("DeliveryOptions.Repository.findDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(deliveryOptions.name, clientView)
        .pipe(
          Effect.flatMap((qb) =>
            db.useTransaction((tx) =>
              qb.except(
                tx
                  .select({ id: table.id })
                  .from(table)
                  .where(eq(table.tenantId, clientView.tenantId)),
              ),
            ),
          ),
        ),
  );

  const findActiveDeletes = Effect.fn("DeliveryOptions.Repository.findActiveDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(deliveryOptions.name, clientView)
        .pipe(
          Effect.flatMap((qb) =>
            db.useTransaction((tx) =>
              qb.except(
                tx
                  .select({ id: activeView.id })
                  .from(activeView)
                  .where(eq(activeView.tenantId, clientView.tenantId)),
              ),
            ),
          ),
        ),
  );

  const findActivePublishedRoomDeletes = Effect.fn(
    "DeliveryOptions.Repository.findActivePublishedRoomDeletes",
  )((clientView: ReplicacheClientView) =>
    entriesQueryBuilder
      .deletes(deliveryOptions.name, clientView)
      .pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) =>
            qb.except(
              tx
                .select({ id: activePublishedRoomView.id })
                .from(activePublishedRoomView)
                .where(eq(activePublishedRoomView.tenantId, clientView.tenantId)),
            ),
          ),
        ),
      ),
  );

  const findFastForward = Effect.fn("DeliveryOptions.Repository.findFastForward")(
    (clientView: ReplicacheClientView, excludeIds: Array<DeliveryOption["id"]>) =>
      entriesQueryBuilder.fastForward(deliveryOptions.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${deliveryOptions.name}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    table,
                    and(eq(entriesTable.entityId, table.id), notInArray(table.id, excludeIds)),
                  )
                  .where(eq(table.tenantId, clientView.tenantId)),
              );

            return tx.with(cte).select(cte[deliveryOptions.name]).from(cte);
          }),
        ),
      ),
  );

  const findActiveFastForward = Effect.fn("DeliveryOptions.Repository.findActiveFastForward")(
    (clientView: ReplicacheClientView, excludeIds: Array<ActiveDeliveryOption["id"]>) =>
      entriesQueryBuilder.fastForward(deliveryOptions.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activeView)}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    activeView,
                    and(
                      eq(entriesTable.entityId, activeView.id),
                      notInArray(activeView.id, excludeIds),
                    ),
                  )
                  .where(eq(activeView.tenantId, clientView.tenantId)),
              );

            return tx.with(cte).select(cte[getViewName(activeView)]).from(cte);
          }),
        ),
      ),
  );

  const findActivePublishedRoomFastForward = Effect.fn(
    "DeliveryOptions.Repository.findActivePublishedRoomFastForward",
  )(
    (
      clientView: ReplicacheClientView,
      excludeIds: Array<ActivePublishedRoomDeliveryOption["id"]>,
    ) =>
      entriesQueryBuilder.fastForward(deliveryOptions.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activePublishedRoomView)}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    activePublishedRoomView,
                    and(
                      eq(entriesTable.entityId, activePublishedRoomView.id),
                      notInArray(activePublishedRoomView.id, excludeIds),
                    ),
                  )
                  .where(eq(activePublishedRoomView.tenantId, clientView.tenantId)),
              );

            return tx.with(cte).select(cte[getViewName(activePublishedRoomView)]).from(cte);
          }),
        ),
      ),
  );

  const findById = Effect.fn("DeliveryOptions.Repository.findById")(
    (id: DeliveryOption["id"], tenantId: DeliveryOption["tenantId"]) =>
      db
        .useTransaction((tx) =>
          tx
            .select()
            .from(table)
            .where(and(eq(table.id, id), eq(table.tenantId, tenantId))),
        )
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  const updateById = Effect.fn("DeliveryOptions.Repository.updateById")(
    (
      id: DeliveryOption["id"],
      deliveryOption: Partial<Omit<DeliveryOption, "id" | "tenantId">>,
      tenantId: DeliveryOption["tenantId"],
    ) =>
      db
        .useTransaction((tx) =>
          tx
            .update(table)
            .set(deliveryOption)
            .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
            .returning(),
        )
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  const updateByRoomId = Effect.fn("DeliveryOptions.Repository.updateByRoomId")(
    (
      roomId: DeliveryOption["roomId"],
      deliveryOption: Partial<Omit<DeliveryOption, "id" | "roomId" | "tenantId">>,
      tenantId: DeliveryOption["tenantId"],
    ) =>
      db.useTransaction((tx) =>
        tx
          .update(table)
          .set(deliveryOption)
          .where(and(eq(table.roomId, roomId), eq(table.tenantId, tenantId)))
          .returning(),
      ),
  );

  return {
    create,
    findCreates,
    findActiveCreates,
    findActivePublishedRoomCreates,
    findUpdates,
    findActiveUpdates,
    findActivePublishedRoomUpdates,
    findDeletes,
    findActiveDeletes,
    findActivePublishedRoomDeletes,
    findFastForward,
    findActiveFastForward,
    findActivePublishedRoomFastForward,
    findById,
    updateById,
    updateByRoomId,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(DeliveryOptionsRepository));
