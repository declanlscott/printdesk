import {
  and,
  eq,
  getTableName,
  getViewName,
  getViewSelectedFields,
  inArray,
  not,
  notInArray,
} from "drizzle-orm";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Struct from "effect/Struct";

import { AccessControl } from "../access-control";
import { Database } from "../database";
import { PoliciesContract } from "../policies/contract";
import { QueriesContract } from "../queries/contract";
import { Replicache } from "../replicache";
import { ReplicacheClientViewEntriesSchema } from "../replicache/schemas";
import { CustomerGroupsContract } from "./contracts";
import {
  CustomerGroupMembershipsSchema,
  CustomerGroupsSchema,
} from "./schemas";

import type { InferInsertModel } from "drizzle-orm";
import type { ReplicacheClientViewsSchema } from "../replicache/schemas";

export namespace Groups {
  export class CustomersRepository extends Effect.Service<CustomersRepository>()(
    "@printdesk/core/groups/CustomersRepository",
    {
      accessors: true,
      dependencies: [
        Database.TransactionManager.Default,
        Replicache.ClientViewEntriesQueryBuilder.Default,
      ],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = CustomerGroupsSchema.table.definition;
        const activeView = CustomerGroupsSchema.activeView;
        const activeMembershipView = CustomerGroupsSchema.activeMembershipView;

        const entriesQueryBuilder =
          yield* Replicache.ClientViewEntriesQueryBuilder;
        const entriesTable = ReplicacheClientViewEntriesSchema.table.definition;

        const upsertMany = Effect.fn("Groups.CustomersRepository.upsertMany")(
          (
            groups: Array.NonEmptyArray<
              InferInsertModel<CustomerGroupsSchema.Table>
            >,
          ) =>
            db.useTransaction((tx) =>
              tx
                .insert(table)
                .values(groups)
                .onConflictDoUpdate({
                  target: [table.id, table.tenantId],
                  set: CustomerGroupsSchema.table.conflictSet,
                })
                .returning(),
            ),
        );

        const findCreates = Effect.fn("Groups.CustomersRepository.findCreates")(
          (clientView: ReplicacheClientViewsSchema.Row) =>
            entriesQueryBuilder.creates(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) => {
                  const cte = tx
                    .$with(`${getTableName(table)}_creates`)
                    .as(
                      tx
                        .select()
                        .from(table)
                        .where(eq(table.tenantId, clientView.tenantId)),
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
          "Groups.CustomersRepository.findActiveCreates",
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder.creates(getTableName(table), clientView).pipe(
            Effect.flatMap((qb) =>
              db.useTransaction((tx) => {
                const cte = tx
                  .$with(`${getViewName(activeView)}_creates`)
                  .as(
                    tx
                      .select()
                      .from(activeView)
                      .where(eq(activeView.tenantId, clientView.tenantId)),
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

        const findActiveMembershipCreates = Effect.fn(
          "Groups.CustomersRepository.findActiveMembershipCreates",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            memberId: CustomerGroupsSchema.ActiveMembershipRow["memberId"],
          ) =>
            entriesQueryBuilder.creates(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) => {
                  const cte = tx
                    .$with(`${getViewName(activeMembershipView)}_creates`)
                    .as(
                      tx
                        .selectDistinctOn(
                          [
                            activeMembershipView.id,
                            activeMembershipView.tenantId,
                          ],
                          Struct.omit(
                            getViewSelectedFields(activeMembershipView),
                            "memberId",
                          ),
                        )
                        .from(activeMembershipView)
                        .where(
                          and(
                            eq(activeMembershipView.memberId, memberId),
                            eq(
                              activeMembershipView.tenantId,
                              clientView.tenantId,
                            ),
                          ),
                        ),
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

        const findUpdates = Effect.fn("Groups.CustomersRepository.findUpdates")(
          (clientView: ReplicacheClientViewsSchema.Row) =>
            entriesQueryBuilder.updates(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) => {
                  const cte = tx
                    .$with(`${getTableName(table)}_updates`)
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

                  return tx
                    .with(cte)
                    .select(cte[getTableName(table)])
                    .from(cte);
                }),
              ),
            ),
        );

        const findActiveUpdates = Effect.fn(
          "Groups.CustomersRepository.findActiveUpdates",
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder.updates(getTableName(table), clientView).pipe(
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
                          not(
                            eq(entriesTable.entityVersion, activeView.version),
                          ),
                          eq(entriesTable.tenantId, activeView.tenantId),
                        ),
                      )
                      .where(eq(activeView.tenantId, clientView.tenantId)),
                  );

                return tx
                  .with(cte)
                  .select(cte[getViewName(activeView)])
                  .from(cte);
              }),
            ),
          ),
        );

        const findActiveMembershipUpdates = Effect.fn(
          "Groups.CustomersRepository.findActiveMembershipUpdates",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            memberId: CustomerGroupsSchema.ActiveMembershipRow["memberId"],
          ) =>
            entriesQueryBuilder.updates(getTableName(table), clientView).pipe(
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
                            not(
                              eq(
                                entriesTable.entityVersion,
                                activeMembershipView.version,
                              ),
                            ),
                            eq(
                              entriesTable.tenantId,
                              activeMembershipView.tenantId,
                            ),
                          ),
                        )
                        .where(
                          and(
                            eq(activeMembershipView.memberId, memberId),
                            eq(
                              activeMembershipView.tenantId,
                              clientView.tenantId,
                            ),
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
                      Struct.omit(
                        cte[getViewName(activeMembershipView)],
                        "memberId",
                      ),
                    )
                    .from(cte);
                }),
              ),
            ),
        );

        const findDeletes = Effect.fn("Groups.CustomersRepository.findDeletes")(
          (clientView: ReplicacheClientViewsSchema.Row) =>
            entriesQueryBuilder
              .deletes(getTableName(table), clientView)
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

        const findActiveDeletes = Effect.fn(
          "Groups.CustomersRepository.findActiveDeletes",
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder
            .deletes(getTableName(table), clientView)
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
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            memberId: CustomerGroupsSchema.ActiveMembershipRow["memberId"],
          ) =>
            entriesQueryBuilder.deletes(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) =>
                  qb.except(
                    tx
                      .selectDistinctOn(
                        [
                          activeMembershipView.id,
                          activeMembershipView.tenantId,
                        ],
                        { id: activeMembershipView.id },
                      )
                      .from(activeMembershipView)
                      .where(
                        and(
                          eq(activeMembershipView.memberId, memberId),
                          eq(
                            activeMembershipView.tenantId,
                            clientView.tenantId,
                          ),
                        ),
                      ),
                  ),
                ),
              ),
            ),
        );

        const findFastForward = Effect.fn(
          "Groups.CustomersRepository.findFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<CustomerGroupsSchema.Row["id"]>,
          ) =>
            entriesQueryBuilder
              .fastForward(getTableName(table), clientView)
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
                              eq(entriesTable.entityId, table.id),
                              notInArray(table.id, excludeIds),
                            ),
                          )
                          .where(eq(table.tenantId, clientView.tenantId)),
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
          "Groups.CustomersRepository.findActiveFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<CustomerGroupsSchema.Row["id"]>,
          ) =>
            entriesQueryBuilder
              .fastForward(getTableName(table), clientView)
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
                              eq(entriesTable.entityId, activeView.id),
                              notInArray(activeView.id, excludeIds),
                            ),
                          )
                          .where(eq(activeView.tenantId, clientView.tenantId)),
                      );

                    return tx
                      .with(cte)
                      .select(cte[getViewName(activeView)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActiveMembershipFastForward = Effect.fn(
          "Groups.CustomersRepository.findActiveMembershipFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<CustomerGroupsSchema.ActiveMembershipRow["id"]>,
            memberId: CustomerGroupsSchema.ActiveMembershipRow["memberId"],
          ) =>
            entriesQueryBuilder
              .fastForward(getTableName(table), clientView)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(
                        `${getViewName(activeMembershipView)}_fast_forward`,
                      )
                      .as(
                        qb
                          .innerJoin(
                            activeMembershipView,
                            and(
                              eq(
                                entriesTable.entityId,
                                activeMembershipView.id,
                              ),
                              notInArray(activeMembershipView.id, excludeIds),
                            ),
                          )
                          .where(
                            and(
                              eq(activeMembershipView.memberId, memberId),
                              eq(
                                activeMembershipView.tenantId,
                                clientView.tenantId,
                              ),
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
                        Struct.omit(
                          cte[getViewName(activeMembershipView)],
                          "memberId",
                        ),
                      )
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActiveMemberIds = Effect.fn(
          "Groups.CustomersRepository.findActiveMemberIds",
        )(
          (
            id: CustomerGroupsSchema.Row["id"],
            tenantId: CustomerGroupsSchema.Row["tenantId"],
          ) =>
            db.useTransaction((tx) =>
              tx
                .select({ memberId: activeMembershipView.memberId })
                .from(activeMembershipView)
                .where(
                  and(
                    eq(activeMembershipView.id, id),
                    eq(activeMembershipView.tenantId, tenantId),
                  ),
                ),
            ),
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
        } as const;
      }),
    },
  ) {}

  export class CustomersQueries extends Effect.Service<CustomersQueries>()(
    "@printdesk/core/groups/CustomersQueries",
    {
      accessors: true,
      dependencies: [CustomersRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* CustomersRepository;

        const differenceResolver =
          new QueriesContract.DifferenceResolverBuilder(
            getTableName(CustomerGroupsSchema.table.definition),
          )
            .query(AccessControl.permission("customer_groups:read"), {
              findCreates: repository.findCreates,
              findUpdates: repository.findUpdates,
              findDeletes: repository.findDeletes,
              fastForward: repository.findFastForward,
            })
            .query(AccessControl.permission("active_customer_groups:read"), {
              findCreates: repository.findActiveCreates,
              findUpdates: repository.findActiveUpdates,
              findDeletes: repository.findActiveDeletes,
              fastForward: repository.findActiveFastForward,
            })
            .query(
              AccessControl.permission(
                "active_membership_customer_groups:read",
              ),
              {
                findCreates: repository.findActiveMembershipCreates,
                findUpdates: repository.findActiveMembershipUpdates,
                findDeletes: repository.findActiveMembershipDeletes,
                fastForward: repository.findActiveMembershipFastForward,
              },
            )
            .build();

        return { differenceResolver } as const;
      }),
    },
  ) {}

  export class CustomersPolicies extends Effect.Service<CustomersPolicies>()(
    "@printdesk/core/groups/CustomersPolicies",
    {
      accessors: true,
      dependencies: [CustomersRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* CustomersRepository;

        const isMemberOf = PoliciesContract.makePolicy(
          CustomerGroupsContract.isMemberOf,
          {
            make: Effect.fn("Groups.CustomersPolicies.isMemberOf.make")(
              ({ id, memberId }) =>
                AccessControl.policy((principal) =>
                  repository
                    .findActiveMemberIds(id, principal.tenantId)
                    .pipe(
                      Effect.map(
                        Array.some(Equal.equals(memberId ?? principal.userId)),
                      ),
                    ),
                ),
            ),
          },
        );

        return { isMemberOf } as const;
      }),
    },
  ) {}

  export class CustomerMembershipsRepository extends Effect.Service<CustomerMembershipsRepository>()(
    "@printdesk/core/groups/CustomerMembershipsRepository",
    {
      accessors: true,
      dependencies: [
        Database.TransactionManager.Default,
        Replicache.ClientViewEntriesQueryBuilder.Default,
      ],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = CustomerGroupMembershipsSchema.table.definition;
        const activeView = CustomerGroupMembershipsSchema.activeView;

        const entriesQueryBuilder =
          yield* Replicache.ClientViewEntriesQueryBuilder;
        const entriesTable = ReplicacheClientViewEntriesSchema.table.definition;

        const upsertMany = Effect.fn(
          "Groups.CustomerMembershipsRepository.upsertMany",
        )(
          (
            memberships: Array.NonEmptyArray<
              InferInsertModel<CustomerGroupMembershipsSchema.Table>
            >,
          ) =>
            db.useTransaction((tx) =>
              tx
                .insert(table)
                .values(memberships)
                .onConflictDoUpdate({
                  target: [table.id, table.tenantId],
                  set: CustomerGroupMembershipsSchema.table.conflictSet,
                })
                .returning(),
            ),
        );

        const findCreates = Effect.fn(
          "Groups.CustomerMembershipsRepository.findCreates",
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder.creates(getTableName(table), clientView).pipe(
            Effect.flatMap((qb) =>
              db.useTransaction((tx) => {
                const cte = tx
                  .$with(`${getTableName(table)}_creates`)
                  .as(
                    tx
                      .select()
                      .from(table)
                      .where(eq(table.tenantId, clientView.tenantId)),
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
          "Groups.CustomerMembershipsRepository.findActiveCreates",
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder.creates(getTableName(table), clientView).pipe(
            Effect.flatMap((qb) =>
              db.useTransaction((tx) => {
                const cte = tx
                  .$with(`${getViewName(activeView)}_creates`)
                  .as(
                    tx
                      .select()
                      .from(activeView)
                      .where(eq(activeView.tenantId, clientView.tenantId)),
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

        const findUpdates = Effect.fn(
          "Groups.CustomerMembershipsRepository.findUpdates",
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder.updates(getTableName(table), clientView).pipe(
            Effect.flatMap((qb) =>
              db.useTransaction((tx) => {
                const cte = tx
                  .$with(`${getTableName(table)}_updates`)
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

                return tx.with(cte).select(cte[getTableName(table)]).from(cte);
              }),
            ),
          ),
        );

        const findActiveUpdates = Effect.fn(
          "Groups.CustomerMembershipsRepository.findActiveUpdates",
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder.updates(getTableName(table), clientView).pipe(
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
                          not(
                            eq(entriesTable.entityVersion, activeView.version),
                          ),
                          eq(entriesTable.tenantId, activeView.tenantId),
                        ),
                      )
                      .where(eq(activeView.tenantId, clientView.tenantId)),
                  );

                return tx
                  .with(cte)
                  .select(cte[getViewName(activeView)])
                  .from(cte);
              }),
            ),
          ),
        );

        const findDeletes = Effect.fn(
          "Groups.CustomerMembershipsRepository.findDeletes",
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder
            .deletes(getTableName(table), clientView)
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

        const findActiveDeletes = Effect.fn(
          "Groups.CustomerMembershipsRepository.findActiveDeletes",
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder
            .deletes(getTableName(table), clientView)
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

        const findFastForward = Effect.fn(
          "Groups.CustomerMembershipsRepository.findFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<CustomerGroupsSchema.Row["id"]>,
          ) =>
            entriesQueryBuilder
              .fastForward(getTableName(table), clientView)
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
                              eq(entriesTable.entityId, table.id),
                              notInArray(table.id, excludeIds),
                            ),
                          )
                          .where(eq(table.tenantId, clientView.tenantId)),
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
          "Groups.CustomerMembershipsRepository.findActiveFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<CustomerGroupsSchema.Row["id"]>,
          ) =>
            entriesQueryBuilder
              .fastForward(getTableName(table), clientView)
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
                              eq(entriesTable.entityId, activeView.id),
                              notInArray(activeView.id, excludeIds),
                            ),
                          )
                          .where(eq(activeView.tenantId, clientView.tenantId)),
                      );

                    return tx
                      .with(cte)
                      .select(cte[getViewName(activeView)])
                      .from(cte);
                  }),
                ),
              ),
        );

        return {
          upsertMany,
          findCreates,
          findActiveCreates,
          findUpdates,
          findActiveUpdates,
          findDeletes,
          findActiveDeletes,
          findFastForward,
          findActiveFastForward,
        } as const;
      }),
    },
  ) {}

  export class CustomerMembershipsQueries extends Effect.Service<CustomerMembershipsQueries>()(
    "@printdesk/core/groups/CustomerMembershipsQueries",
    {
      accessors: true,
      dependencies: [CustomerMembershipsRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* CustomerMembershipsRepository;

        const differenceResolver =
          new QueriesContract.DifferenceResolverBuilder(
            getTableName(CustomerGroupMembershipsSchema.table.definition),
          )
            .query(
              AccessControl.permission("customer_group_memberships:read"),
              {
                findCreates: repository.findCreates,
                findUpdates: repository.findUpdates,
                findDeletes: repository.findDeletes,
                fastForward: repository.findFastForward,
              },
            )
            .query(
              AccessControl.permission(
                "active_customer_group_memberships:read",
              ),
              {
                findCreates: repository.findActiveCreates,
                findUpdates: repository.findActiveUpdates,
                findDeletes: repository.findActiveDeletes,
                fastForward: repository.findActiveFastForward,
              },
            )
            .build();

        return { differenceResolver } as const;
      }),
    },
  ) {}
}
