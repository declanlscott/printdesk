import { and, eq, getViewName, getViewSelectedFields, inArray, not, notInArray } from "drizzle-orm";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Struct from "effect/Struct";

import { CustomerGroupsRepository } from ".";
import { Database } from "../../../database";
import { replicacheClientViewEntries } from "../../../replicache/sql";
import { SyncQueryBuilder } from "../../../sync/query-builder";
import {
  activeCustomerGroupsView,
  activeMembershipCustomerGroupsView,
  customerGroups,
} from "../../sql";

import type { InferInsertModel } from "drizzle-orm";
import type { ReplicacheClientView } from "../../../replicache/sql";
import type {
  ActiveCustomerGroup,
  ActiveMembershipCustomerGroup,
  CustomerGroup,
  CustomerGroupByOrigin,
  CustomerGroupsTable,
} from "../../sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const db = yield* Database;
  const table = customerGroups.table;
  const activeView = activeCustomerGroupsView;
  const activeMembershipView = activeMembershipCustomerGroupsView;

  const entriesQueryBuilder = yield* SyncQueryBuilder;
  const entriesTable = replicacheClientViewEntries.table;

  const upsertMany = Effect.fn("Groups.CustomersRepository.upsertMany")(
    (values: Array.NonEmptyArray<InferInsertModel<CustomerGroupsTable>>) =>
      db.useTransaction((tx) =>
        tx
          .insert(table)
          .values(values)
          .onConflictDoUpdate({
            target: [table.id, table.tenantId],
            set: customerGroups.conflictSet,
          })
          .returning(),
      ),
  );

  const findCreates = Effect.fn("Groups.CustomersRepository.findCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(customerGroups.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${customerGroups.name}_creates`)
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

  const findActiveCreates = Effect.fn("Groups.CustomersRepository.findActiveCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(customerGroups.name, clientView).pipe(
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

  const findActiveMembershipCreates = Effect.fn(
    "Groups.CustomersRepository.findActiveMembershipCreates",
  )((clientView: ReplicacheClientView, memberId: ActiveMembershipCustomerGroup["memberId"]) =>
    entriesQueryBuilder.creates(customerGroups.name, clientView).pipe(
      Effect.flatMap((qb) =>
        db.useTransaction((tx) => {
          const cte = tx.$with(`${getViewName(activeMembershipView)}_creates`).as(
            tx
              .selectDistinctOn(
                [activeMembershipView.id, activeMembershipView.tenantId],
                Struct.omit(getViewSelectedFields(activeMembershipView), ["memberId"]),
              )
              .from(activeMembershipView)
              .where(
                and(
                  eq(activeMembershipView.memberId, memberId),
                  eq(activeMembershipView.tenantId, clientView.tenantId),
                ),
              ),
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

  const findUpdates = Effect.fn("Groups.CustomersRepository.findUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(customerGroups.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${customerGroups.name}_updates`)
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

            return tx.with(cte).select(cte[customerGroups.name]).from(cte);
          }),
        ),
      ),
  );

  const findActiveUpdates = Effect.fn("Groups.CustomersRepository.findActiveUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(customerGroups.name, clientView).pipe(
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

  const findActiveMembershipUpdates = Effect.fn(
    "Groups.CustomersRepository.findActiveMembershipUpdates",
  )((clientView: ReplicacheClientView, memberId: ActiveMembershipCustomerGroup["memberId"]) =>
    entriesQueryBuilder.updates(customerGroups.name, clientView).pipe(
      Effect.flatMap((qb) =>
        db.useTransaction((tx) => {
          const cte = tx
            .$with(`${getViewName(activeMembershipView)}_updates`)
            .as(
              qb
                .innerJoin(
                  activeMembershipView,
                  and(
                    eq(entriesTable.entityId, activeMembershipView.id),
                    not(eq(entriesTable.entityVersion, activeMembershipView.version)),
                    eq(entriesTable.tenantId, activeMembershipView.tenantId),
                  ),
                )
                .where(
                  and(
                    eq(activeMembershipView.memberId, memberId),
                    eq(activeMembershipView.tenantId, clientView.tenantId),
                  ),
                ),
            );

          return tx
            .with(cte)
            .selectDistinctOn(
              [
                cte[getViewName(activeMembershipView)].id,
                cte[getViewName(activeMembershipView)].tenantId,
              ],
              Struct.omit(cte[getViewName(activeMembershipView)], ["memberId"]),
            )
            .from(cte);
        }),
      ),
    ),
  );

  const findDeletes = Effect.fn("Groups.CustomersRepository.findDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(customerGroups.name, clientView)
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

  const findActiveDeletes = Effect.fn("Groups.CustomersRepository.findActiveDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(customerGroups.name, clientView)
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

  const findActiveMembershipDeletes = Effect.fn(
    "Groups.CustomersRepository.findActiveMembershipDeletes",
  )((clientView: ReplicacheClientView, memberId: ActiveMembershipCustomerGroup["memberId"]) =>
    entriesQueryBuilder.deletes(customerGroups.name, clientView).pipe(
      Effect.flatMap((qb) =>
        db.useTransaction((tx) =>
          qb.except(
            tx
              .selectDistinctOn([activeMembershipView.id, activeMembershipView.tenantId], {
                id: activeMembershipView.id,
              })
              .from(activeMembershipView)
              .where(
                and(
                  eq(activeMembershipView.memberId, memberId),
                  eq(activeMembershipView.tenantId, clientView.tenantId),
                ),
              ),
          ),
        ),
      ),
    ),
  );

  const findFastForward = Effect.fn("Groups.CustomersRepository.findFastForward")(
    (clientView: ReplicacheClientView, excludeIds: Array<CustomerGroup["id"]>) =>
      entriesQueryBuilder.fastForward(customerGroups.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${customerGroups.name}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    table,
                    and(eq(entriesTable.entityId, table.id), notInArray(table.id, excludeIds)),
                  )
                  .where(eq(table.tenantId, clientView.tenantId)),
              );

            return tx.with(cte).select(cte[customerGroups.name]).from(cte);
          }),
        ),
      ),
  );

  const findActiveFastForward = Effect.fn("Groups.CustomersRepository.findActiveFastForward")(
    (clientView: ReplicacheClientView, excludeIds: Array<ActiveCustomerGroup["id"]>) =>
      entriesQueryBuilder.fastForward(customerGroups.name, clientView).pipe(
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

  const findActiveMembershipFastForward = Effect.fn(
    "Groups.CustomersRepository.findActiveMembershipFastForward",
  )(
    (
      clientView: ReplicacheClientView,
      excludeIds: Array<ActiveMembershipCustomerGroup["id"]>,
      memberId: ActiveMembershipCustomerGroup["memberId"],
    ) =>
      entriesQueryBuilder.fastForward(customerGroups.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activeMembershipView)}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    activeMembershipView,
                    and(
                      eq(entriesTable.entityId, activeMembershipView.id),
                      notInArray(activeMembershipView.id, excludeIds),
                    ),
                  )
                  .where(
                    and(
                      eq(activeMembershipView.memberId, memberId),
                      eq(activeMembershipView.tenantId, clientView.tenantId),
                    ),
                  ),
              );

            return tx
              .with(cte)
              .selectDistinctOn(
                [
                  cte[getViewName(activeMembershipView)].id,
                  cte[getViewName(activeMembershipView)].tenantId,
                ],
                Struct.omit(cte[getViewName(activeMembershipView)], ["memberId"]),
              )
              .from(cte);
          }),
        ),
      ),
  );

  const findActiveMemberIds = Effect.fn("Groups.CustomersRepository.findActiveMemberIds")(
    (
      id: ActiveMembershipCustomerGroup["id"],
      tenantId: ActiveMembershipCustomerGroup["tenantId"],
    ) =>
      db.useTransaction((tx) =>
        tx
          .select({ memberId: activeMembershipView.memberId })
          .from(activeMembershipView)
          .where(and(eq(activeMembershipView.id, id), eq(activeMembershipView.tenantId, tenantId))),
      ),
  );

  const findByOrigin = Effect.fn("Groups.CustomersRepository.findByOrigin")(
    <TCustomerGroupOrigin extends CustomerGroup["origin"]>(
      origin: TCustomerGroupOrigin,
      tenantId: CustomerGroup["tenantId"],
    ) =>
      db
        .useTransaction((tx) =>
          tx
            .select()
            .from(table)
            .where(and(eq(table.origin, origin), eq(table.tenantId, tenantId))),
        )
        .pipe(Effect.map((groups) => groups as Array<CustomerGroupByOrigin<TCustomerGroupOrigin>>)),
  );

  return {
    upsertMany,
    findCreates,
    findActiveCreates,
    findActiveMembershipCreates,
    findUpdates,
    findActiveUpdates,
    findActiveMembershipUpdates,
    findDeletes,
    findActiveDeletes,
    findActiveMembershipDeletes,
    findFastForward,
    findActiveFastForward,
    findActiveMembershipFastForward,
    findActiveMemberIds,
    findByOrigin,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(CustomerGroupsRepository));
