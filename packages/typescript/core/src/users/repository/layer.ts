import { and, eq, getViewName, inArray, not, notInArray } from "drizzle-orm";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { UsersRepository } from ".";
import { Database } from "../../database";
import { replicacheClientViewEntriesTable } from "../../replicache/sql";
import { SyncQueryBuilder } from "../../sync/query-builder";
import { activeUsersView, users } from "../sql";

import type { InferInsertModel } from "drizzle-orm";
import type { ReplicacheClientView } from "../../replicache/sql";
import type { Prettify } from "../../utils";
import type { ActiveUser, User, UserByOrigin, UsersTable } from "../sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const db = yield* Database;
  const table = users.table;
  const activeView = activeUsersView;

  const entriesQueryBuilder = yield* SyncQueryBuilder;
  const entriesTable = replicacheClientViewEntriesTable;

  const create = Effect.fn("Users.Repository.create")((value: InferInsertModel<UsersTable>) =>
    db
      .useTransaction((tx) => tx.insert(table).values(value).returning())
      .pipe(
        Effect.map(Array.head),
        Effect.flatMap(Effect.fromOption),
        Effect.catchTag("NoSuchElementError", Effect.die),
      ),
  );

  const upsertMany = Effect.fn("Users.Repository.upsertMany")(
    (values: Array.NonEmptyArray<InferInsertModel<UsersTable>>) =>
      db.useTransaction((tx) =>
        tx
          .insert(table)
          .values(values)
          .onConflictDoUpdate({
            target: [table.id, table.tenantId],
            set: users.conflictSet,
          })
          .returning(),
      ),
  );

  const findCreates = Effect.fn("Users.Repository.findCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(users.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${users.name}_creates`)
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

  const findActiveCreates = Effect.fn("Users.Repository.findActiveCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(users.name, clientView).pipe(
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

  const findUpdates = Effect.fn("Users.Repository.findUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(users.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${users.name}_updates`)
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

            return tx.with(cte).select(cte[users.name]).from(cte);
          }),
        ),
      ),
  );

  const findActiveUpdates = Effect.fn("Users.Repository.findActiveUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(users.name, clientView).pipe(
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

  const findDeletes = Effect.fn("Users.Repository.finDeletes")((clientView: ReplicacheClientView) =>
    entriesQueryBuilder
      .deletes(users.name, clientView)
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

  const findActiveDeletes = Effect.fn("Users.Repository.findActiveDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(users.name, clientView)
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

  const findFastForward = Effect.fn("Users.Repository.findFastForward")(
    (clientView: ReplicacheClientView, excludeIds: Array<User["id"]>) =>
      entriesQueryBuilder.fastForward(users.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${users.name}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    table,
                    and(eq(entriesTable.entityId, table.id), notInArray(table.id, excludeIds)),
                  )
                  .where(eq(table.tenantId, clientView.tenantId)),
              );

            return tx.with(cte).select(cte[users.name]).from(cte);
          }),
        ),
      ),
  );

  const findActiveFastForward = Effect.fn("Users.Repository.findActiveFastForward")(
    (clientView: ReplicacheClientView, excludeIds: Array<ActiveUser["id"]>) =>
      entriesQueryBuilder.fastForward(users.name, clientView).pipe(
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

  const findById = Effect.fn("Users.Repository.findById")(
    (id: User["id"], tenantId: User["tenantId"]) =>
      db
        .useTransaction((tx) =>
          tx
            .select()
            .from(table)
            .where(and(eq(table.id, id), eq(table.tenantId, tenantId))),
        )
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  const findByOrigin = Effect.fn("Users.Repository.findByOrigin")(
    <TUserOrigin extends User["origin"]>(origin: TUserOrigin, tenantId: User["tenantId"]) =>
      db
        .useTransaction((tx) =>
          tx
            .select()
            .from(table)
            .where(and(eq(table.origin, origin), eq(table.tenantId, tenantId))),
        )
        .pipe(Effect.map((users) => users as Array<Prettify<UserByOrigin<TUserOrigin>>>)),
  );

  const findByUsernames = Effect.fn("Users.Repository.findByUsernames")(
    (usernames: ReadonlyArray<User["username"]>, tenantId: User["tenantId"]) =>
      db.useTransaction((tx) =>
        tx
          .select()
          .from(table)
          .where(and(inArray(table.username, usernames), eq(table.tenantId, tenantId))),
      ),
  );

  const updateById = Effect.fn("Users.Repository.updateById")(
    (id: User["id"], user: Partial<Omit<User, "id" | "tenantId">>, tenantId: User["tenantId"]) =>
      db
        .useTransaction((tx) =>
          tx
            .update(table)
            .set(user)
            .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
            .returning(),
        )
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  return {
    create,
    upsertMany,
    findCreates,
    findActiveCreates,
    findUpdates,
    findActiveUpdates,
    findDeletes,
    findActiveDeletes,
    findFastForward,
    findActiveFastForward,
    findById,
    findByOrigin,
    findByUsernames,
    updateById,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(UsersRepository));
