import { and, eq, getTableColumns, getViewName, inArray, not, notInArray } from "drizzle-orm";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { GroupMembershipsRepository, GroupMembershipsSyncRepository } from ".";
import { Database } from "../../../database";
import { replicacheClientViewEntries } from "../../../replicache/sql";
import { SyncQueryBuilder } from "../../../sync/query-builder";
import { users } from "../../../users/sql";
import { activeGroupMembershipsView, groupMemberships, groups } from "../../sql";

import type { InferInsertModel } from "drizzle-orm";
import type { ReplicacheClientView } from "../../../replicache/sql";
import type {
  ActiveGroupMembership,
  Group,
  GroupMembership,
  GroupMembershipsTable,
} from "../../sql";

export type Repository = Effect.Success<typeof makeRepository>;
export const makeRepository = Effect.gen(function* () {
  const db = yield* Database;
  const table = groupMemberships.table;
  const activeView = activeGroupMembershipsView;

  const upsertMany = Effect.fn("Groups.MembershipsRepository.upsertMany")(
    (values: Array.NonEmptyArray<InferInsertModel<GroupMembershipsTable>>) =>
      db.useTransaction((tx) =>
        tx
          .insert(table)
          .values(values)
          .onConflictDoUpdate({
            target: [table.id, table.tenantId],
            set: groupMemberships.conflictSet,
          })
          .returning(),
      ),
  );

  const findWithMemberAndGroupByTenantId = Effect.fn(
    "Groups.MembershipsRepository.findWithMemberAndGroupByTenantId",
  )((tenantId: GroupMembership["tenantId"]) =>
    db.useTransaction((tx) =>
      tx
        .select({
          Group: getTableColumns(groups.table),
          member: getTableColumns(users.table),
          membership: getTableColumns(table),
        })
        .from(table)
        .innerJoin(
          groups.table,
          and(eq(groups.table.id, table.groupId), eq(groups.table.tenantId, table.tenantId)),
        )
        .innerJoin(
          users.table,
          and(eq(users.table.id, table.userId), eq(users.table.tenantId, table.tenantId)),
        )
        .where(eq(table.tenantId, tenantId)),
    ),
  );

  const findByIds = Effect.fn("Groups.MembershipsRepository.findByIds")(
    (
      groupId: GroupMembership["groupId"],
      userId: GroupMembership["userId"],
      tenantId: GroupMembership["tenantId"],
    ) =>
      db.useTransaction((tx) =>
        tx
          .select()
          .from(table)
          .where(
            and(eq(table.groupId, groupId), eq(table.userId, userId), eq(table.tenantId, tenantId)),
          ),
      ),
  );

  const findActiveByIds = Effect.fn("Groups.MembershipsRepository.findActiveByIds")(
    (
      groupId: GroupMembership["groupId"],
      userId: GroupMembership["userId"],
      tenantId: GroupMembership["tenantId"],
    ) =>
      db.useTransaction((tx) =>
        tx
          .select()
          .from(activeView)
          .where(
            and(
              eq(activeView.groupId, groupId),
              eq(activeView.userId, userId),
              eq(activeView.tenantId, tenantId),
            ),
          ),
      ),
  );

  return {
    upsertMany,
    findWithMemberAndGroupByTenantId,
    findByIds,
    findActiveByIds,
  } as const;
});
export const repositoryLayer = makeRepository.pipe(Layer.effect(GroupMembershipsRepository));

export type SyncRepository = Effect.Success<typeof makeSyncRepository>;
export const makeSyncRepository = Effect.gen(function* () {
  const db = yield* Database;
  const table = groupMemberships.table;
  const activeView = activeGroupMembershipsView;

  const entriesQueryBuilder = yield* SyncQueryBuilder;
  const entriesTable = replicacheClientViewEntries.table;

  const findCreates = Effect.fn("Groups.MembershipsRepository.findCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(groupMemberships.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${groupMemberships.name}_creates`)
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

  const findActiveCreates = Effect.fn("Groups.MembershipsRepository.findActiveCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(groupMemberships.name, clientView).pipe(
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

  const findUpdates = Effect.fn("Groups.MembershipsRepository.findUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(groupMemberships.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${groupMemberships.name}_updates`)
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

            return tx.with(cte).select(cte[groupMemberships.name]).from(cte);
          }),
        ),
      ),
  );

  const findActiveUpdates = Effect.fn("Groups.MembershipsRepository.findActiveUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(groupMemberships.name, clientView).pipe(
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

  const findDeletes = Effect.fn("Groups.MembershipsRepository.findDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(groupMemberships.name, clientView)
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

  const findActiveDeletes = Effect.fn("Groups.MembershipsRepository.findActiveDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(groupMemberships.name, clientView)
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

  const findFastForward = Effect.fn("Groups.MembershipsRepository.findFastForward")(
    (clientView: ReplicacheClientView, excludeIds: Array<Group["id"]>) =>
      entriesQueryBuilder.fastForward(groupMemberships.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${groupMemberships.name}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    table,
                    and(eq(entriesTable.entityId, table.id), notInArray(table.id, excludeIds)),
                  )
                  .where(eq(table.tenantId, clientView.tenantId)),
              );

            return tx.with(cte).select(cte[groupMemberships.name]).from(cte);
          }),
        ),
      ),
  );

  const findActiveFastForward = Effect.fn("Groups.MembershipsRepository.findActiveFastForward")(
    (clientView: ReplicacheClientView, excludeIds: Array<ActiveGroupMembership["id"]>) =>
      entriesQueryBuilder.fastForward(groupMemberships.name, clientView).pipe(
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

  return {
    findCreates,
    findActiveCreates,
    findUpdates,
    findActiveUpdates,
    findDeletes,
    findActiveDeletes,
    findFastForward,
    findActiveFastForward,
  } as const;
});
export const syncRepositoryLayer = makeSyncRepository.pipe(
  Layer.effect(GroupMembershipsSyncRepository),
);

export const layer = Layer.mergeAll(repositoryLayer, syncRepositoryLayer);
