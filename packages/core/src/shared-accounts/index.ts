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
import * as Predicate from "effect/Predicate";
import * as Struct from "effect/Struct";

import { AccessControl } from "../access-control";
import { Database } from "../database";
import { Events } from "../events";
import { MutationsContract } from "../mutations/contract";
import { PoliciesContract } from "../policies/contract";
import { QueriesContract } from "../queries/contract";
import { Replicache } from "../replicache";
import { ReplicacheNotifier } from "../replicache/notifier";
import { ReplicacheClientViewEntriesSchema } from "../replicache/schemas";
import {
  SharedAccountCustomerAccessContract,
  SharedAccountManagerAccessContract,
  SharedAccountsContract,
} from "./contracts";
import {
  SharedAccountCustomerAccessSchema,
  SharedAccountCustomerGroupAccessSchema,
  SharedAccountManagerAccessSchema,
  SharedAccountsSchema,
} from "./schemas";

import type { InferInsertModel } from "drizzle-orm";
import type { ReplicacheClientViewsSchema } from "../replicache/schemas";

export namespace SharedAccounts {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/shared-accounts/Repository",
    {
      dependencies: [
        Database.TransactionManager.Default,
        Replicache.ClientViewEntriesQueryBuilder.Default,
      ],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = SharedAccountsSchema.table.definition;
        const activeView = SharedAccountsSchema.activeView;
        const activeManagerAuthorizedView =
          SharedAccountsSchema.activeManagerAuthorizedView;
        const activeCustomerAuthorizedView =
          SharedAccountsSchema.activeCustomerAuthorizedView;

        const entriesQueryBuilder =
          yield* Replicache.ClientViewEntriesQueryBuilder;
        const entriesTable = ReplicacheClientViewEntriesSchema.table.definition;

        const upsertMany = Effect.fn("SharedAccounts.Repository.upsertMany")(
          (values: Array<InferInsertModel<SharedAccountsSchema.Table>>) =>
            db
              .useTransaction((tx) =>
                tx
                  .insert(table)
                  .values(values)
                  .onConflictDoUpdate({
                    target: [
                      table.name,
                      table.papercutAccountId,
                      table.tenantId,
                    ],
                    set: SharedAccountsSchema.table.conflictSet,
                  })
                  .returning(),
              )
              .pipe(
                Effect.flatMap(Array.head),
                Effect.catchTag("NoSuchElementException", Effect.die),
              ),
        );

        const findCreates = Effect.fn("SharedAccounts.Repository.findCreates")(
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
          "SharedAccounts.Repository.findActiveCreates",
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

        const findActiveCustomerAuthorizedCreates = Effect.fn(
          "SharedAccounts.Repository.findActiveCustomerAuthorizedCreates",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            customerId: SharedAccountsSchema.ActiveCustomerAuthorizedRow["customerId"],
          ) =>
            entriesQueryBuilder.creates(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) => {
                  const cte = tx
                    .$with(
                      `${getViewName(activeCustomerAuthorizedView)}_creates`,
                    )
                    .as(
                      tx
                        .selectDistinctOn(
                          [
                            activeCustomerAuthorizedView.id,
                            activeCustomerAuthorizedView.tenantId,
                          ],
                          Struct.omit(
                            getViewSelectedFields(activeCustomerAuthorizedView),
                            "customerId",
                          ),
                        )
                        .from(activeCustomerAuthorizedView)
                        .where(
                          and(
                            eq(
                              activeCustomerAuthorizedView.customerId,
                              customerId,
                            ),
                            eq(
                              activeCustomerAuthorizedView.tenantId,
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

        const findActiveManagerAuthorizedCreates = Effect.fn(
          "SharedAccounts.Repository.findActiveManagerAuthorizedCreates",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            managerId: SharedAccountsSchema.ActiveManagerAuthorizedRow["managerId"],
          ) =>
            entriesQueryBuilder.creates(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) => {
                  const cte = tx
                    .$with(
                      `${getViewName(activeManagerAuthorizedView)}_creates`,
                    )
                    .as(
                      tx
                        .selectDistinctOn(
                          [
                            activeManagerAuthorizedView.id,
                            activeManagerAuthorizedView.tenantId,
                          ],
                          Struct.omit(
                            getViewSelectedFields(activeManagerAuthorizedView),
                            "managerId",
                          ),
                        )
                        .from(activeManagerAuthorizedView)
                        .where(
                          and(
                            eq(
                              activeManagerAuthorizedView.managerId,
                              managerId,
                            ),
                            eq(
                              activeManagerAuthorizedView.tenantId,
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

        const findUpdates = Effect.fn("SharedAccounts.Repository.findUpdates")(
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
          "SharedAccounts.Repository.findActiveUpdates",
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

        const findActiveCustomerAuthorizedUpdates = Effect.fn(
          "SharedAccounts.Repository.findActiveCustomerAuthorizedUpdates",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            customerId: SharedAccountsSchema.ActiveCustomerAuthorizedRow["customerId"],
          ) =>
            entriesQueryBuilder.updates(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) => {
                  const cte = tx
                    .$with(
                      `${getViewName(activeCustomerAuthorizedView)}_updates`,
                    )
                    .as(
                      qb
                        .innerJoin(
                          activeCustomerAuthorizedView,
                          and(
                            eq(
                              entriesTable.entityId,
                              activeCustomerAuthorizedView.id,
                            ),
                            not(
                              eq(
                                entriesTable.entityVersion,
                                activeCustomerAuthorizedView.version,
                              ),
                            ),
                            eq(
                              entriesTable.tenantId,
                              activeCustomerAuthorizedView.tenantId,
                            ),
                          ),
                        )
                        .where(
                          and(
                            eq(
                              activeCustomerAuthorizedView.customerId,
                              customerId,
                            ),
                            eq(
                              activeCustomerAuthorizedView.tenantId,
                              clientView.tenantId,
                            ),
                          ),
                        ),
                    );

                  return tx
                    .with(cte)
                    .selectDistinctOn(
                      [
                        cte[getViewName(activeCustomerAuthorizedView)].id,
                        cte[getViewName(activeCustomerAuthorizedView)].tenantId,
                      ],
                      Struct.omit(
                        cte[getViewName(activeCustomerAuthorizedView)],
                        "customerId",
                      ),
                    )
                    .from(cte);
                }),
              ),
            ),
        );

        const findActiveManagerAuthorizedUpdates = Effect.fn(
          "SharedAccounts.Repository.findActiveManagerAuthorizedUpdates",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            managerId: SharedAccountsSchema.ActiveManagerAuthorizedRow["managerId"],
          ) =>
            entriesQueryBuilder.updates(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) => {
                  const cte = tx
                    .$with(
                      `${getViewName(activeManagerAuthorizedView)}_updates`,
                    )
                    .as(
                      qb
                        .innerJoin(
                          activeManagerAuthorizedView,
                          and(
                            eq(
                              entriesTable.entityId,
                              activeManagerAuthorizedView.id,
                            ),
                            not(
                              eq(
                                entriesTable.entityVersion,
                                activeManagerAuthorizedView.version,
                              ),
                            ),
                            eq(
                              entriesTable.tenantId,
                              activeManagerAuthorizedView.tenantId,
                            ),
                          ),
                        )
                        .where(
                          and(
                            eq(
                              activeManagerAuthorizedView.managerId,
                              managerId,
                            ),
                            eq(
                              activeManagerAuthorizedView.tenantId,
                              clientView.tenantId,
                            ),
                          ),
                        ),
                    );

                  return tx
                    .with(cte)
                    .selectDistinctOn(
                      [
                        cte[getViewName(activeManagerAuthorizedView)].id,
                        cte[getViewName(activeManagerAuthorizedView)].tenantId,
                      ],
                      Struct.omit(
                        cte[getViewName(activeManagerAuthorizedView)],
                        "managerId",
                      ),
                    )
                    .from(cte);
                }),
              ),
            ),
        );

        const findDeletes = Effect.fn("SharedAccounts.Repository.findDeletes")(
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
          "SharedAccounts.Repository.findActiveDeletes",
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

        const findActiveCustomerAuthorizedDeletes = Effect.fn(
          "SharedAccounts.Repository.findActiveCustomerAuthorizedDeletes",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            customerId: SharedAccountsSchema.ActiveCustomerAuthorizedRow["customerId"],
          ) =>
            entriesQueryBuilder.deletes(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) =>
                  qb.except(
                    tx
                      .selectDistinctOn(
                        [
                          activeCustomerAuthorizedView.id,
                          activeCustomerAuthorizedView.tenantId,
                        ],
                        { id: activeCustomerAuthorizedView.id },
                      )
                      .from(activeCustomerAuthorizedView)
                      .where(
                        and(
                          eq(
                            activeCustomerAuthorizedView.customerId,
                            customerId,
                          ),
                          eq(
                            activeCustomerAuthorizedView.tenantId,
                            clientView.tenantId,
                          ),
                        ),
                      ),
                  ),
                ),
              ),
            ),
        );

        const findActiveManagerAuthorizedDeletes = Effect.fn(
          "SharedAccounts.Repository.findActiveManagerAuthorizedDeletes",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            managerId: SharedAccountsSchema.ActiveManagerAuthorizedRow["managerId"],
          ) =>
            entriesQueryBuilder.deletes(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) =>
                  qb.except(
                    tx
                      .selectDistinctOn(
                        [
                          activeManagerAuthorizedView.id,
                          activeManagerAuthorizedView.tenantId,
                        ],
                        { id: activeManagerAuthorizedView.id },
                      )
                      .from(activeManagerAuthorizedView)
                      .where(
                        and(
                          eq(activeManagerAuthorizedView.managerId, managerId),
                          eq(
                            activeManagerAuthorizedView.tenantId,
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
          "SharedAccounts.Repository.findFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<SharedAccountsSchema.Row["id"]>,
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
                              eq(entriesTable.entity, table.id),
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
          "SharedAccounts.Repository.findActiveFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<SharedAccountsSchema.ActiveRow["id"]>,
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
                              eq(entriesTable.entity, activeView.id),
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

        const findActiveCustomerAuthorizedFastForward = Effect.fn(
          "SharedAccounts.Repository.findActiveCustomerAuthorizedFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<
              SharedAccountsSchema.ActiveCustomerAuthorizedRow["id"]
            >,
            customerId: SharedAccountsSchema.ActiveCustomerAuthorizedRow["customerId"],
          ) =>
            entriesQueryBuilder
              .fastForward(getTableName(table), clientView)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(
                        `${getViewName(activeCustomerAuthorizedView)}_fast_forward`,
                      )
                      .as(
                        qb
                          .innerJoin(
                            activeCustomerAuthorizedView,
                            and(
                              eq(
                                entriesTable.entityId,
                                activeCustomerAuthorizedView.id,
                              ),
                              notInArray(
                                activeCustomerAuthorizedView.id,
                                excludeIds,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(
                                activeCustomerAuthorizedView.customerId,
                                customerId,
                              ),
                              eq(
                                activeCustomerAuthorizedView.tenantId,
                                clientView.tenantId,
                              ),
                            ),
                          ),
                      );

                    return tx
                      .with(cte)
                      .selectDistinctOn(
                        [
                          cte[getViewName(activeCustomerAuthorizedView)].id,
                          cte[getViewName(activeCustomerAuthorizedView)]
                            .tenantId,
                        ],
                        Struct.omit(
                          cte[getViewName(activeCustomerAuthorizedView)],
                          "customerId",
                        ),
                      )
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActiveManagerAuthorizedFastForward = Effect.fn(
          "SharedAccounts.Repository.findActiveManagerAuthorizedFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<
              SharedAccountsSchema.ActiveManagerAuthorizedRow["id"]
            >,
            managerId: SharedAccountsSchema.ActiveManagerAuthorizedRow["managerId"],
          ) =>
            entriesQueryBuilder
              .fastForward(getTableName(table), clientView)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(
                        `${getViewName(activeManagerAuthorizedView)}_fast_forward`,
                      )
                      .as(
                        qb
                          .innerJoin(
                            activeManagerAuthorizedView,
                            and(
                              eq(
                                entriesTable.entity,
                                activeManagerAuthorizedView.id,
                              ),
                              notInArray(
                                activeManagerAuthorizedView.id,
                                excludeIds,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(
                                activeManagerAuthorizedView.managerId,
                                managerId,
                              ),
                              eq(
                                activeManagerAuthorizedView.tenantId,
                                clientView.tenantId,
                              ),
                            ),
                          ),
                      );

                    return tx
                      .with(cte)
                      .selectDistinctOn(
                        [
                          cte[getViewName(activeManagerAuthorizedView)].id,
                          cte[getViewName(activeManagerAuthorizedView)]
                            .tenantId,
                        ],
                        Struct.omit(
                          cte[getViewName(activeManagerAuthorizedView)],
                          "managerId",
                        ),
                      )
                      .from(cte);
                  }),
                ),
              ),
        );

        const findById = Effect.fn("SharedAccounts.Repository.findById")(
          (
            id: SharedAccountsSchema.Row["id"],
            tenantId: SharedAccountsSchema.Row["tenantId"],
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

        const findByOrigin = Effect.fn(
          "SharedAccounts.Repository.findByOrigin",
        )(
          <TSharedAccountOrigin extends SharedAccountsSchema.Row["origin"]>(
            origin: TSharedAccountOrigin,
            tenantId: SharedAccountsSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .select()
                  .from(table)
                  .where(
                    and(
                      eq(table.origin, origin),
                      origin === "papercut"
                        ? not(eq(table.papercutAccountId, -1))
                        : undefined,
                      eq(table.tenantId, tenantId),
                    ),
                  ),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const findActiveAuthorizedCustomerIds = Effect.fn(
          "SharedAccounts.Repository.findActiveAuthorizedCustomerIds",
        )(
          (
            id: SharedAccountsSchema.Row["id"],
            tenantId: SharedAccountsSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .select({
                    customerId: activeCustomerAuthorizedView.customerId,
                  })
                  .from(activeCustomerAuthorizedView)
                  .where(
                    and(
                      eq(activeCustomerAuthorizedView.id, id),
                      eq(activeCustomerAuthorizedView.tenantId, tenantId),
                    ),
                  ),
              )
              .pipe(Effect.map(Array.map(Struct.get("customerId")))),
        );

        const findActiveAuthorizedManagerIds = Effect.fn(
          "SharedAccounts.Repository.findActiveAuthorizedManagerIds",
        )(
          (
            id: SharedAccountsSchema.Row["id"],
            tenantId: SharedAccountsSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .select({
                    managerId: activeManagerAuthorizedView.managerId,
                  })
                  .from(activeManagerAuthorizedView)
                  .where(
                    and(
                      eq(activeManagerAuthorizedView.id, id),
                      eq(activeManagerAuthorizedView.tenantId, tenantId),
                    ),
                  ),
              )
              .pipe(Effect.map(Array.map(Struct.get("managerId")))),
        );

        const updateById = Effect.fn("SharedAccounts.Repository.updateById")(
          (
            id: SharedAccountsSchema.Row["id"],
            sharedAccount: Partial<
              Omit<SharedAccountsSchema.Row, "id" | "tenantId">
            >,
            tenantId: SharedAccountsSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .update(table)
                  .set(sharedAccount)
                  .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
                  .returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        return {
          upsertMany,
          findCreates,
          findActiveCreates,
          findActiveCustomerAuthorizedCreates,
          findActiveManagerAuthorizedCreates,
          findUpdates,
          findActiveUpdates,
          findActiveCustomerAuthorizedUpdates,
          findActiveManagerAuthorizedUpdates,
          findDeletes,
          findActiveDeletes,
          findActiveCustomerAuthorizedDeletes,
          findActiveManagerAuthorizedDeletes,
          findFastForward,
          findActiveFastForward,
          findActiveCustomerAuthorizedFastForward,
          findActiveManagerAuthorizedFastForward,
          findById,
          findByOrigin,
          findActiveAuthorizedCustomerIds,
          findActiveAuthorizedManagerIds,
          updateById,
        } as const;
      }),
    },
  ) {}

  export class Queries extends Effect.Service<Queries>()(
    "@printdesk/core/shared-accounts/Queries",
    {
      accessors: true,
      dependencies: [Repository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const differenceResolver =
          new QueriesContract.DifferenceResolverBuilder(
            getTableName(SharedAccountsSchema.table.definition),
          )
            .query(AccessControl.permission("shared_accounts:read"), {
              findCreates: repository.findCreates,
              findUpdates: repository.findUpdates,
              findDeletes: repository.findDeletes,
              fastForward: repository.findFastForward,
            })
            .query(AccessControl.permission("active_shared_accounts:read"), {
              findCreates: repository.findActiveCreates,
              findUpdates: repository.findActiveUpdates,
              findDeletes: repository.findActiveDeletes,
              fastForward: repository.findActiveFastForward,
            })
            .query(
              AccessControl.permission(
                "active_customer_authorized_shared_accounts:read",
              ),
              {
                findCreates: repository.findActiveCustomerAuthorizedCreates,
                findUpdates: repository.findActiveCustomerAuthorizedUpdates,
                findDeletes: repository.findActiveCustomerAuthorizedDeletes,
                fastForward: repository.findActiveCustomerAuthorizedFastForward,
              },
            )
            .query(
              AccessControl.permission(
                "active_manager_authorized_shared_accounts:read",
              ),
              {
                findCreates: repository.findActiveManagerAuthorizedCreates,
                findUpdates: repository.findActiveManagerAuthorizedUpdates,
                findDeletes: repository.findActiveManagerAuthorizedDeletes,
                fastForward: repository.findActiveManagerAuthorizedFastForward,
              },
            )
            .build();

        return { differenceResolver } as const;
      }),
    },
  ) {}

  export class Policies extends Effect.Service<Policies>()(
    "@printdesk/core/shared-accounts/Policies",
    {
      accessors: true,
      dependencies: [Repository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const isCustomerAuthorized = PoliciesContract.makePolicy(
          SharedAccountsContract.isCustomerAuthorized,
          {
            make: Effect.fn(
              "SharedAccounts.Policies.isCustomerAuthorized.make",
            )(({ id, customerId }) =>
              AccessControl.userPolicy((user) =>
                repository
                  .findActiveAuthorizedCustomerIds(id, user.tenantId)
                  .pipe(
                    Effect.map(Array.some(Equal.equals(customerId ?? user.id))),
                  ),
              ),
            ),
          },
        );

        const isManagerAuthorized = PoliciesContract.makePolicy(
          SharedAccountsContract.isManagerAuthorized,
          {
            make: Effect.fn("SharedAccounts.Policies.isManagerAuthorized.make")(
              ({ id, managerId }) =>
                AccessControl.userPolicy((user) =>
                  repository
                    .findActiveAuthorizedManagerIds(id, user.tenantId)
                    .pipe(
                      Effect.map(
                        Array.some(Equal.equals(managerId ?? user.id)),
                      ),
                    ),
                ),
            ),
          },
        );

        const canEdit = PoliciesContract.makePolicy(
          SharedAccountsContract.canEdit,
          {
            make: Effect.fn("SharedAccounts.Policies.canEdit.make")(({ id }) =>
              AccessControl.privatePolicy(({ tenantId }) =>
                repository
                  .findById(id, tenantId)
                  .pipe(
                    Effect.map(Struct.get("deletedAt")),
                    Effect.map(Predicate.isNull),
                  ),
              ),
            ),
          },
        );

        const canDelete = PoliciesContract.makePolicy(
          SharedAccountsContract.canDelete,
          {
            make: Effect.fn("SharedAccounts.Policies.canDelete.make")(
              canEdit.make,
            ),
          },
        );

        const canRestore = PoliciesContract.makePolicy(
          SharedAccountsContract.canRestore,
          {
            make: Effect.fn("SharedAccounts.Policies.canRestore.make")(
              ({ id }) =>
                AccessControl.privatePolicy(({ tenantId }) =>
                  repository
                    .findById(id, tenantId)
                    .pipe(
                      Effect.map(Struct.get("deletedAt")),
                      Effect.map(Predicate.isNotNull),
                    ),
                ),
            ),
          },
        );

        return {
          isCustomerAuthorized,
          isManagerAuthorized,
          canEdit,
          canDelete,
          canRestore,
        } as const;
      }),
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/shared-accounts/Mutations",
    {
      accessors: true,
      dependencies: [Repository.Default, Policies.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const policies = yield* Policies;

        const notifier = yield* ReplicacheNotifier;
        const PullPermission = yield* Events.ReplicachePullPermission;

        const notifyEdit = (
          sharedAccount: SharedAccountsContract.DataTransferObject,
        ) =>
          notifier.notify(
            Array.make(
              PullPermission.make({ permission: "shared_accounts:read" }),
              PullPermission.make({
                permission: "active_shared_accounts:read",
              }),
              Events.makeReplicachePullPolicy(
                SharedAccountsContract.isCustomerAuthorized.make({
                  id: sharedAccount.id,
                }),
              ),
              Events.makeReplicachePullPolicy(
                SharedAccountsContract.isManagerAuthorized.make({
                  id: sharedAccount.id,
                }),
              ),
            ),
          );
        const notifyDelete = notifyEdit;
        const notifyRestore = notifyEdit;

        const edit = MutationsContract.makeMutation(
          SharedAccountsContract.edit,
          {
            makePolicy: Effect.fn("SharedAccounts.Mutations.edit.makePolicy")(
              ({ id }) =>
                AccessControl.every(
                  AccessControl.permission("shared_accounts:update"),
                  policies.canEdit.make({ id }),
                ),
            ),
            mutator: Effect.fn("SharedAccounts.Mutations.edit.mutator")(
              ({ id, ...sharedAccount }, user) =>
                repository
                  .updateById(id, sharedAccount, user.tenantId)
                  .pipe(Effect.tap(notifyEdit)),
            ),
          },
        );

        const delete_ = MutationsContract.makeMutation(
          SharedAccountsContract.delete_,
          {
            makePolicy: Effect.fn("SharedAccounts.Mutations.delete.makePolicy")(
              ({ id }) =>
                AccessControl.every(
                  AccessControl.permission("shared_accounts:delete"),
                  policies.canDelete.make({ id }),
                ),
            ),
            mutator: Effect.fn("SharedAccounts.Mutations.delete.mutator")(
              ({ id, deletedAt }, user) =>
                repository
                  .updateById(id, { deletedAt }, user.tenantId)
                  .pipe(Effect.tap(notifyDelete)),
            ),
          },
        );

        const restore = MutationsContract.makeMutation(
          SharedAccountsContract.restore,
          {
            makePolicy: Effect.fn(
              "SharedAccounts.Mutations.restore.makePolicy",
            )(({ id }) =>
              AccessControl.every(
                AccessControl.permission("shared_accounts:delete"),
                policies.canRestore.make({ id }),
              ),
            ),
            mutator: Effect.fn("SharedAccounts.Mutations.restore.mutator")(
              ({ id }, user) =>
                repository
                  .updateById(id, { deletedAt: null }, user.tenantId)
                  .pipe(Effect.tap(notifyRestore)),
            ),
          },
        );

        return { edit, delete: delete_, restore } as const;
      }),
    },
  ) {}

  export class CustomerAccessRepository extends Effect.Service<CustomerAccessRepository>()(
    "@printdesk/core/shared-accounts/CustomerAccessRepository",
    {
      dependencies: [
        Database.TransactionManager.Default,
        Replicache.ClientViewEntriesQueryBuilder.Default,
      ],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = SharedAccountCustomerAccessSchema.table.definition;
        const activeView = SharedAccountCustomerAccessSchema.activeView;
        const activeAuthorizedView =
          SharedAccountCustomerAccessSchema.activeAuthorizedView;

        const entriesQueryBuilder =
          yield* Replicache.ClientViewEntriesQueryBuilder;
        const entriesTable = ReplicacheClientViewEntriesSchema.table.definition;

        const upsertMany = Effect.fn(
          "SharedAccounts.CustomerAccessRepository.upsertMany",
        )(
          (
            values: Array<
              InferInsertModel<SharedAccountCustomerAccessSchema.Table>
            >,
          ) =>
            db.useTransaction((tx) =>
              tx
                .insert(table)
                .values(values)
                .onConflictDoUpdate({
                  target: [
                    table.customerId,
                    table.sharedAccountId,
                    table.tenantId,
                  ],
                  set: SharedAccountCustomerAccessSchema.table.conflictSet,
                })
                .returning(),
            ),
        );

        const findCreates = Effect.fn(
          "SharedAccounts.CustomerAccessRepository.findCreates",
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
          "SharedAccounts.CustomerAccessRepository.findActiveCreates",
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

        const findActiveAuthorizedCreates = Effect.fn(
          "SharedAccounts.CustomerAccessRepository.findActiveAuthorizedCreates",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            customerId: SharedAccountCustomerAccessSchema.ActiveAuthorizedRow["customerId"],
          ) =>
            entriesQueryBuilder.creates(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) => {
                  const cte = tx
                    .$with(
                      `${SharedAccountCustomerAccessContract.activeAuthorizedViewName}_creates`,
                    )
                    .as(
                      tx
                        .select()
                        .from(activeAuthorizedView)
                        .where(
                          and(
                            eq(activeAuthorizedView.customerId, customerId),
                            eq(
                              activeAuthorizedView.tenantId,
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

        const findUpdates = Effect.fn(
          "SharedAccounts.CustomerAccessRepository.findUpdates",
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder.updates(getTableName(table), clientView).pipe(
            Effect.flatMap((qb) =>
              db.useTransaction((tx) => {
                const cte = tx
                  .$with(`${getViewName(activeView)}_updates`)
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
          "SharedAccounts.CustomerAccessRepository.findActiveUpdates",
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

        const findActiveAuthorizedUpdates = Effect.fn(
          "SharedAccounts.CustomerAccessRepository.findActiveAuthorizedUpdates",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            customerId: SharedAccountCustomerAccessSchema.ActiveAuthorizedRow["customerId"],
          ) =>
            entriesQueryBuilder.updates(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) => {
                  const cte = tx
                    .$with(
                      `${SharedAccountCustomerAccessContract.activeAuthorizedViewName}_updates`,
                    )
                    .as(
                      qb
                        .innerJoin(
                          activeAuthorizedView,
                          and(
                            eq(entriesTable.entityId, activeAuthorizedView.id),
                            not(
                              eq(
                                entriesTable.entityVersion,
                                activeAuthorizedView.version,
                              ),
                            ),
                            eq(
                              entriesTable.tenantId,
                              activeAuthorizedView.tenantId,
                            ),
                          ),
                        )
                        .where(
                          and(
                            eq(activeAuthorizedView.customerId, customerId),
                            eq(
                              activeAuthorizedView.tenantId,
                              clientView.tenantId,
                            ),
                          ),
                        ),
                    );

                  return tx
                    .with(cte)
                    .select(cte[getViewName(activeAuthorizedView)])
                    .from(cte);
                }),
              ),
            ),
        );

        const findDeletes = Effect.fn(
          "SharedAccounts.CustomerAccessRepository.findDeletes",
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
          "SharedAccounts.CustomerAccessRepository.findActiveDeletes",
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

        const findActiveAuthorizedDeletes = Effect.fn(
          "SharedAccounts.Repository.findActiveAuthorizedDeletes",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            customerId: SharedAccountCustomerAccessSchema.ActiveAuthorizedRow["customerId"],
          ) =>
            entriesQueryBuilder.deletes(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) =>
                  qb.except(
                    tx
                      .select({ id: activeAuthorizedView.id })
                      .from(activeAuthorizedView)
                      .where(
                        and(
                          eq(activeAuthorizedView.customerId, customerId),
                          eq(
                            activeAuthorizedView.tenantId,
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
          "SharedAccounts.Repository.findFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<SharedAccountCustomerAccessSchema.Row["id"]>,
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
          "SharedAccounts.Repository.findActiveFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<
              SharedAccountCustomerAccessSchema.ActiveRow["id"]
            >,
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

        const findActiveAuthorizedFastForward = Effect.fn(
          "SharedAccounts.Repository.findActiveAuthorizedFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<
              SharedAccountCustomerAccessSchema.ActiveAuthorizedRow["id"]
            >,
            customerId: SharedAccountCustomerAccessSchema.ActiveAuthorizedRow["customerId"],
          ) =>
            entriesQueryBuilder
              .fastForward(getTableName(table), clientView)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(
                        `${SharedAccountCustomerAccessContract.activeAuthorizedViewName}_fast_forward`,
                      )
                      .as(
                        qb
                          .innerJoin(
                            activeAuthorizedView,
                            and(
                              eq(
                                entriesTable.entityId,
                                activeAuthorizedView.id,
                              ),
                              notInArray(activeAuthorizedView.id, excludeIds),
                            ),
                          )
                          .where(
                            and(
                              eq(activeAuthorizedView.customerId, customerId),
                              eq(
                                activeAuthorizedView.tenantId,
                                clientView.tenantId,
                              ),
                            ),
                          ),
                      );

                    return tx
                      .with(cte)
                      .select(cte[getViewName(activeAuthorizedView)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findByOrigin = Effect.fn(
          "SharedAccounts.CustomerAccessRepository.findByOrigin",
        )(
          <TSharedAccountOrigin extends SharedAccountsSchema.Row["origin"]>(
            origin: TSharedAccountOrigin,
            tenantId: SharedAccountCustomerAccessSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .select({ customerAccess: table })
                  .from(table)
                  .innerJoin(
                    SharedAccountsSchema.table.definition,
                    and(
                      eq(
                        SharedAccountsSchema.table.definition.id,
                        table.sharedAccountId,
                      ),
                      eq(
                        SharedAccountsSchema.table.definition.tenantId,
                        table.tenantId,
                      ),
                    ),
                  )
                  .where(
                    and(
                      eq(SharedAccountsSchema.table.definition.origin, origin),
                      origin === "papercut"
                        ? not(
                            eq(
                              SharedAccountsSchema.table.definition
                                .papercutAccountId,
                              -1,
                            ),
                          )
                        : undefined,
                      eq(table.tenantId, tenantId),
                    ),
                  ),
              )
              .pipe(Effect.map(Array.map(Struct.get("customerAccess")))),
        );

        return {
          upsertMany,
          findCreates,
          findActiveCreates,
          findActiveAuthorizedCreates,
          findUpdates,
          findActiveUpdates,
          findActiveAuthorizedUpdates,
          findDeletes,
          findActiveDeletes,
          findActiveAuthorizedDeletes,
          findFastForward,
          findActiveFastForward,
          findActiveAuthorizedFastForward,
          findByOrigin,
        } as const;
      }),
    },
  ) {}

  export class CustomerAccessQueries extends Effect.Service<CustomerAccessQueries>()(
    "@printdesk/core/shared-accounts/CustomerAccessQueries",
    {
      accessors: true,
      dependencies: [CustomerAccessRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* CustomerAccessRepository;

        const differenceResolver =
          new QueriesContract.DifferenceResolverBuilder(
            getTableName(SharedAccountCustomerAccessSchema.table.definition),
          )
            .query(
              AccessControl.permission("shared_account_customer_access:read"),
              {
                findCreates: repository.findCreates,
                findUpdates: repository.findUpdates,
                findDeletes: repository.findDeletes,
                fastForward: repository.findFastForward,
              },
            )
            .query(
              AccessControl.permission(
                "active_shared_account_customer_access:read",
              ),
              {
                findCreates: repository.findActiveCreates,
                findUpdates: repository.findActiveUpdates,
                findDeletes: repository.findActiveDeletes,
                fastForward: repository.findActiveFastForward,
              },
            )
            .query(
              AccessControl.permission(
                "active_authorized_shared_account_customer_access:read",
              ),
              {
                findCreates: repository.findActiveAuthorizedCreates,
                findUpdates: repository.findActiveAuthorizedUpdates,
                findDeletes: repository.findActiveAuthorizedDeletes,
                fastForward: repository.findActiveAuthorizedFastForward,
              },
            )
            .build();

        return { differenceResolver } as const;
      }),
    },
  ) {}

  export class ManagerAccessRepository extends Effect.Service<ManagerAccessRepository>()(
    "@printdesk/core/shared-accounts/ManagerAccessRepository",
    {
      dependencies: [
        Database.TransactionManager.Default,
        Replicache.ClientViewEntriesQueryBuilder.Default,
      ],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = SharedAccountManagerAccessSchema.table.definition;
        const activeView = SharedAccountManagerAccessSchema.activeView;
        const activeCustomerAuthorizedView =
          SharedAccountManagerAccessSchema.activeCustomerAuthorizedView;

        const entriesQueryBuilder =
          yield* Replicache.ClientViewEntriesQueryBuilder;
        const entriesTable = ReplicacheClientViewEntriesSchema.table.definition;

        const create = Effect.fn(
          "SharedAccounts.ManagerAccessRepository.create",
        )((access: InferInsertModel<SharedAccountManagerAccessSchema.Table>) =>
          db
            .useTransaction((tx) => tx.insert(table).values(access).returning())
            .pipe(
              Effect.flatMap(Array.head),
              Effect.catchTag("NoSuchElementException", Effect.die),
            ),
        );

        const findCreates = Effect.fn(
          "SharedAccounts.ManagerAccessRepository.findCreates",
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
          "SharedAccounts.ManagerAccessRepository.findActiveCreates",
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

        const findActiveAuthorizedCreates = Effect.fn(
          "SharedAccounts.ManagerAccessRepository.findActiveAuthorizedCreates",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            managerId: SharedAccountManagerAccessSchema.Row["managerId"],
          ) =>
            entriesQueryBuilder.creates(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) => {
                  const cte = tx
                    .$with(
                      `${SharedAccountManagerAccessContract.activeAuthorizedViewName}_creates`,
                    )
                    .as(
                      tx
                        .select(getViewSelectedFields(activeView))
                        .from(activeView)
                        .where(
                          and(
                            eq(activeView.managerId, managerId),
                            eq(activeView.tenantId, clientView.tenantId),
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

        const findActiveCustomerAuthorizedCreates = Effect.fn(
          "SharedAccounts.ManagerAccessRepository.findActiveCustomerAuthorizedCreates",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            customerId: SharedAccountCustomerAccessSchema.Row["customerId"],
          ) =>
            entriesQueryBuilder.creates(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) => {
                  const cte = tx
                    .$with(
                      `${getViewName(activeCustomerAuthorizedView)}_creates`,
                    )
                    .as(
                      tx
                        .selectDistinctOn(
                          [
                            activeCustomerAuthorizedView.id,
                            activeCustomerAuthorizedView.tenantId,
                          ],
                          Struct.omit(
                            getViewSelectedFields(activeCustomerAuthorizedView),
                            "customerId",
                          ),
                        )
                        .from(activeCustomerAuthorizedView)
                        .where(
                          and(
                            eq(
                              activeCustomerAuthorizedView.customerId,
                              customerId,
                            ),
                            eq(
                              activeCustomerAuthorizedView.tenantId,
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

        const findUpdates = Effect.fn(
          "SharedAccounts.ManagerAccessRepository.findUpdates",
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
          "SharedAccounts.ManagerAccessRepository.findActiveUpdates",
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

        const findActiveAuthorizedUpdates = Effect.fn(
          "SharedAccounts.ManagerAccessRepository.findActiveAuthorizedUpdates",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            managerId: SharedAccountManagerAccessSchema.Row["managerId"],
          ) =>
            entriesQueryBuilder.updates(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) => {
                  const cte = tx
                    .$with(
                      `${SharedAccountManagerAccessContract.activeAuthorizedViewName}_updates`,
                    )
                    .as(
                      qb
                        .innerJoin(
                          activeView,
                          and(
                            eq(entriesTable.entityId, activeView.id),
                            not(
                              eq(
                                entriesTable.entityVersion,
                                activeView.version,
                              ),
                            ),
                            eq(entriesTable.tenantId, activeView.tenantId),
                          ),
                        )
                        .where(
                          and(
                            eq(activeView.managerId, managerId),
                            eq(activeView.tenantId, clientView.tenantId),
                          ),
                        ),
                    );

                  return tx
                    .with(cte)
                    .select(cte[getViewName(activeView)])
                    .from(cte);
                }),
              ),
            ),
        );

        const findActiveCustomerAuthorizedUpdates = Effect.fn(
          "SharedAccounts.ManagerAccessRepository.findActiveCustomerAuthorizedUpdates",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            customerId: SharedAccountCustomerAccessSchema.Row["customerId"],
          ) =>
            entriesQueryBuilder.updates(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) => {
                  const cte = tx
                    .$with(
                      `${getViewName(activeCustomerAuthorizedView)}_updates`,
                    )
                    .as(
                      qb
                        .innerJoin(
                          activeCustomerAuthorizedView,
                          and(
                            eq(
                              entriesTable.entityId,
                              activeCustomerAuthorizedView.id,
                            ),
                            not(
                              eq(
                                entriesTable.entityVersion,
                                activeCustomerAuthorizedView.version,
                              ),
                            ),
                            eq(
                              entriesTable.tenantId,
                              activeCustomerAuthorizedView.tenantId,
                            ),
                          ),
                        )
                        .where(
                          and(
                            eq(
                              activeCustomerAuthorizedView.customerId,
                              customerId,
                            ),
                            eq(
                              activeCustomerAuthorizedView.tenantId,
                              clientView.tenantId,
                            ),
                          ),
                        ),
                    );

                  return tx
                    .with(cte)
                    .selectDistinctOn(
                      [
                        cte[getViewName(activeCustomerAuthorizedView)].id,
                        cte[getViewName(activeCustomerAuthorizedView)].tenantId,
                      ],
                      Struct.omit(
                        cte[getViewName(activeCustomerAuthorizedView)],
                        "customerId",
                      ),
                    )
                    .from(cte);
                }),
              ),
            ),
        );

        const findDeletes = Effect.fn(
          "SharedAccounts.ManagerAccessRepository.findDeletes",
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
          "SharedAccounts.ManagerAccessRepository.findActiveDeletes",
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

        const findActiveAuthorizedDeletes = Effect.fn(
          "SharedAccounts.ManagerAccessRepository.findActiveAuthorizedDeletes",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            managerId: SharedAccountManagerAccessSchema.Row["managerId"],
          ) =>
            entriesQueryBuilder.deletes(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) =>
                  qb.except(
                    tx
                      .select({ id: activeView.id })
                      .from(activeView)
                      .where(
                        and(
                          eq(activeView.managerId, managerId),
                          eq(activeView.tenantId, clientView.tenantId),
                        ),
                      ),
                  ),
                ),
              ),
            ),
        );

        const findActiveCustomerAuthorizedDeletes = Effect.fn(
          "SharedAccounts.ManagerAccessRepository.findActiveCustomerAuthorizedDeletes",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            customerId: SharedAccountCustomerAccessSchema.Row["customerId"],
          ) =>
            entriesQueryBuilder.deletes(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) =>
                  qb.except(
                    tx
                      .selectDistinctOn(
                        [
                          activeCustomerAuthorizedView.id,
                          activeCustomerAuthorizedView.tenantId,
                        ],
                        { id: activeCustomerAuthorizedView.id },
                      )
                      .from(activeCustomerAuthorizedView)
                      .where(
                        and(
                          eq(
                            activeCustomerAuthorizedView.customerId,
                            customerId,
                          ),
                          eq(
                            activeCustomerAuthorizedView.tenantId,
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
          "SharedAccounts.ManagerAccessRepository.findFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<SharedAccountManagerAccessSchema.Row["id"]>,
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
          "SharedAccounts.ManagerAccessRepository.findActiveFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<SharedAccountManagerAccessSchema.Row["id"]>,
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

        const findActiveAuthorizedFastForward = Effect.fn(
          "SharedAccounts.ManagerAccessRepository.findActiveAuthorizedFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<SharedAccountManagerAccessSchema.Row["id"]>,
            managerId: SharedAccountManagerAccessSchema.Row["managerId"],
          ) =>
            entriesQueryBuilder
              .fastForward(getTableName(table), clientView)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(
                        `${SharedAccountManagerAccessContract.activeAuthorizedViewName}_fast_forward`,
                      )
                      .as(
                        qb
                          .innerJoin(
                            activeView,
                            and(
                              eq(entriesTable.entityId, activeView.id),
                              notInArray(activeView.id, excludeIds),
                            ),
                          )
                          .where(
                            and(
                              eq(activeView.managerId, managerId),
                              eq(activeView.tenantId, clientView.tenantId),
                            ),
                          ),
                      );

                    return tx
                      .with(cte)
                      .select(cte[getViewName(activeView)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActiveCustomerAuthorizedFastForward = Effect.fn(
          "SharedAccounts.ManagerAccessRepository.findActiveCustomerAuthorizedFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<SharedAccountManagerAccessSchema.Row["id"]>,
            customerId: SharedAccountCustomerAccessSchema.Row["customerId"],
          ) =>
            entriesQueryBuilder
              .fastForward(getTableName(table), clientView)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(
                        `${getViewName(activeCustomerAuthorizedView)}_fast_forward`,
                      )
                      .as(
                        qb
                          .innerJoin(
                            activeCustomerAuthorizedView,
                            and(
                              eq(
                                entriesTable.entityId,
                                activeCustomerAuthorizedView.id,
                              ),
                              notInArray(
                                activeCustomerAuthorizedView.id,
                                excludeIds,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(
                                activeCustomerAuthorizedView.customerId,
                                customerId,
                              ),
                              eq(
                                activeCustomerAuthorizedView.tenantId,
                                clientView.tenantId,
                              ),
                            ),
                          ),
                      );

                    return tx
                      .with(cte)
                      .selectDistinctOn(
                        [
                          cte[getViewName(activeCustomerAuthorizedView)].id,
                          cte[getViewName(activeCustomerAuthorizedView)]
                            .tenantId,
                        ],
                        Struct.omit(
                          cte[getViewName(activeCustomerAuthorizedView)],
                          "customerId",
                        ),
                      )
                      .from(cte);
                  }),
                ),
              ),
        );

        const findById = Effect.fn(
          "SharedAccounts.ManagerAccessRepository.findById",
        )(
          (
            id: SharedAccountManagerAccessSchema.Row["id"],
            tenantId: SharedAccountManagerAccessSchema.Row["tenantId"],
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

        const updateById = Effect.fn(
          "SharedAccounts.ManagerAccessRepository.updateById",
        )(
          (
            id: SharedAccountManagerAccessSchema.Row["id"],
            access: Partial<
              Omit<SharedAccountManagerAccessSchema.Row, "id" | "tenantId">
            >,
            tenantId: SharedAccountManagerAccessSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .update(table)
                  .set(access)
                  .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
                  .returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        return {
          create,
          findCreates,
          findActiveCreates,
          findActiveAuthorizedCreates,
          findActiveCustomerAuthorizedCreates,
          findUpdates,
          findActiveUpdates,
          findActiveAuthorizedUpdates,
          findActiveCustomerAuthorizedUpdates,
          findDeletes,
          findActiveDeletes,
          findActiveAuthorizedDeletes,
          findActiveCustomerAuthorizedDeletes,
          findFastForward,
          findActiveFastForward,
          findActiveAuthorizedFastForward,
          findActiveCustomerAuthorizedFastForward,
          findById,
          updateById,
        } as const;
      }),
    },
  ) {}

  export class ManagerAccessQueries extends Effect.Service<ManagerAccessQueries>()(
    "@printdesk/core/shared-accounts/ManagerAccessQueries",
    {
      accessors: true,
      dependencies: [ManagerAccessRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* ManagerAccessRepository;

        const differenceResolver =
          new QueriesContract.DifferenceResolverBuilder(
            getTableName(SharedAccountManagerAccessSchema.table.definition),
          )
            .query(
              AccessControl.permission("shared_account_manager_access:read"),
              {
                findCreates: repository.findCreates,
                findUpdates: repository.findUpdates,
                findDeletes: repository.findDeletes,
                fastForward: repository.findFastForward,
              },
            )
            .query(
              AccessControl.permission(
                "active_shared_account_manager_access:read",
              ),
              {
                findCreates: repository.findActiveCreates,
                findUpdates: repository.findActiveUpdates,
                findDeletes: repository.findActiveDeletes,
                fastForward: repository.findActiveFastForward,
              },
            )
            .query(
              AccessControl.permission(
                "active_shared_account_manager_access:read",
              ),
              {
                findCreates: repository.findActiveAuthorizedCreates,
                findUpdates: repository.findActiveAuthorizedUpdates,
                findDeletes: repository.findActiveAuthorizedDeletes,
                fastForward: repository.findActiveAuthorizedFastForward,
              },
            )
            .query(
              AccessControl.permission(
                "active_authorized_shared_account_manager_access:read",
              ),
              {
                findCreates: repository.findActiveCustomerAuthorizedCreates,
                findUpdates: repository.findActiveCustomerAuthorizedUpdates,
                findDeletes: repository.findActiveCustomerAuthorizedDeletes,
                fastForward: repository.findActiveCustomerAuthorizedFastForward,
              },
            )
            .build();

        return { differenceResolver } as const;
      }),
    },
  ) {}

  export class ManagerAccessPolicies extends Effect.Service<ManagerAccessPolicies>()(
    "@printdesk/core/shared-accounts/ManagerAccessPolicies",
    {
      accessors: true,
      dependencies: [ManagerAccessRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* ManagerAccessRepository;

        const canDelete = PoliciesContract.makePolicy(
          SharedAccountManagerAccessContract.canDelete,
          {
            make: Effect.fn(
              "SharedAccounts.ManagerAccessPolicies.canDelete.make",
            )(({ id }) =>
              AccessControl.privatePolicy(({ tenantId }) =>
                repository
                  .findById(id, tenantId)
                  .pipe(
                    Effect.map(Struct.get("deletedAt")),
                    Effect.map(Predicate.isNull),
                  ),
              ),
            ),
          },
        );

        const canRestore = PoliciesContract.makePolicy(
          SharedAccountManagerAccessContract.canRestore,
          {
            make: Effect.fn(
              "SharedAccounts.ManagerAccessPolicies.canRestore.make",
            )(({ id }) =>
              AccessControl.privatePolicy(({ tenantId }) =>
                repository
                  .findById(id, tenantId)
                  .pipe(
                    Effect.map(Struct.get("deletedAt")),
                    Effect.map(Predicate.isNotNull),
                  ),
              ),
            ),
          },
        );

        return { canDelete, canRestore } as const;
      }),
    },
  ) {}

  export class ManagerAccessMutations extends Effect.Service<ManagerAccessMutations>()(
    "@printdesk/core/shared-accounts/ManagerAccessMutations",
    {
      accessors: true,
      dependencies: [
        ManagerAccessRepository.Default,
        ManagerAccessPolicies.Default,
      ],
      effect: Effect.gen(function* () {
        const repository = yield* ManagerAccessRepository;

        const policies = yield* ManagerAccessPolicies;

        const notifier = yield* ReplicacheNotifier;
        const PullPermission = yield* Events.ReplicachePullPermission;

        const notifyCreate = (
          access: SharedAccountManagerAccessContract.DataTransferObject,
        ) =>
          notifier.notify(
            Array.make(
              PullPermission.make({
                permission: "shared_account_manager_access:read",
              }),
              PullPermission.make({
                permission: "active_shared_account_manager_access:read",
              }),
              Events.makeReplicachePullPolicy(
                SharedAccountsContract.isCustomerAuthorized.make({
                  id: access.sharedAccountId,
                }),
              ),
              Events.makeReplicachePullPolicy(
                SharedAccountsContract.isManagerAuthorized.make({
                  id: access.sharedAccountId,
                }),
              ),
            ),
          );
        const notifyDelete = notifyCreate;
        const notifyRestore = notifyCreate;

        const create = MutationsContract.makeMutation(
          SharedAccountManagerAccessContract.create,
          {
            makePolicy: Effect.fn(
              "SharedAccounts.ManagerAccessMutations.create.makePolicy",
            )(() =>
              AccessControl.permission("shared_account_manager_access:create"),
            ),
            mutator: Effect.fn(
              "SharedAccounts.ManagerAccessMutations.create.mutator",
            )((access, { tenantId }) =>
              repository
                .create({ ...access, tenantId })
                .pipe(Effect.tap(notifyCreate)),
            ),
          },
        );

        const delete_ = MutationsContract.makeMutation(
          SharedAccountManagerAccessContract.delete_,
          {
            makePolicy: Effect.fn(
              "SharedAccounts.ManagerAccessMutations.delete.makePolicy",
            )(({ id }) =>
              AccessControl.every(
                AccessControl.permission(
                  "shared_account_manager_access:delete",
                ),
                policies.canDelete.make({ id }),
              ),
            ),
            mutator: Effect.fn(
              "SharedAccounts.ManagerAccessMutations.delete.mutator",
            )(({ id, deletedAt }, user) =>
              repository
                .updateById(id, { deletedAt }, user.tenantId)
                .pipe(Effect.tap(notifyDelete)),
            ),
          },
        );

        const restore = MutationsContract.makeMutation(
          SharedAccountManagerAccessContract.restore,
          {
            makePolicy: Effect.fn(
              "SharedAccounts.ManagerAccessMutations.restore.makePolicy",
            )(({ id }) =>
              AccessControl.every(
                AccessControl.permission(
                  "shared_account_manager_access:delete",
                ),
                policies.canRestore.make({ id }),
              ),
            ),
            mutator: Effect.fn(
              "SharedAccounts.ManagerAccessMutations.restore.mutator",
            )(({ id }, user) =>
              repository
                .updateById(id, { deletedAt: null }, user.tenantId)
                .pipe(Effect.tap(notifyRestore)),
            ),
          },
        );

        return { create, delete: delete_, restore } as const;
      }),
    },
  ) {}

  export class CustomerGroupAccessRepository extends Effect.Service<CustomerGroupAccessRepository>()(
    "@printdesk/core/shared-accounts/CustomerGroupAccessRepository",
    {
      accessors: true,
      dependencies: [
        Database.TransactionManager.Default,
        Replicache.ClientViewEntriesQueryBuilder.Default,
      ],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = SharedAccountCustomerGroupAccessSchema.table.definition;
        const activeView = SharedAccountCustomerGroupAccessSchema.activeView;
        const activeAuthorizedView =
          SharedAccountCustomerGroupAccessSchema.activeAuthorizedView;

        const entriesQueryBuilder =
          yield* Replicache.ClientViewEntriesQueryBuilder;
        const entriesTable = ReplicacheClientViewEntriesSchema.table.definition;

        const upsertMany = Effect.fn(
          "SharedAccounts.CustomerGroupAccessRepository.upsertMany",
        )(
          (
            values: Array<
              InferInsertModel<SharedAccountCustomerGroupAccessSchema.Table>
            >,
          ) =>
            db.useTransaction((tx) =>
              tx
                .insert(table)
                .values(values)
                .onConflictDoUpdate({
                  target: [
                    table.customerGroupId,
                    table.sharedAccountId,
                    table.tenantId,
                  ],
                  set: SharedAccountCustomerGroupAccessSchema.table.conflictSet,
                })
                .returning(),
            ),
        );

        const findCreates = Effect.fn(
          "SharedAccounts.CustomerGroupAccessRepository.findCreates",
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
          "SharedAccounts.CustomerGroupAccessRepository.findActiveCreates",
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

        const findActiveAuthorizedCreates = Effect.fn(
          "SharedAccounts.CustomerGroupAccessRepository.findActiveAuthorizedCreates",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            memberId: SharedAccountCustomerGroupAccessSchema.ActiveAuthorizedRow["memberId"],
          ) =>
            entriesQueryBuilder.creates(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) => {
                  const cte = tx
                    .$with(`${getViewName(activeAuthorizedView)}_creates`)
                    .as(
                      tx
                        .select()
                        .from(activeAuthorizedView)
                        .where(
                          and(
                            eq(activeAuthorizedView.memberId, memberId),
                            eq(
                              activeAuthorizedView.tenantId,
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

        const findUpdates = Effect.fn(
          "SharedAccounts.CustomerGroupAccessRepository.findUpdates",
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
          "SharedAccounts.CustomerGroupAccessRepository.findActiveUpdates",
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

        const findActiveAuthorizedUpdates = Effect.fn(
          "SharedAccounts.CustomerGroupAccessRepository.findActiveAuthorizedUpdates",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            memberId: SharedAccountCustomerGroupAccessSchema.ActiveAuthorizedRow["memberId"],
          ) =>
            entriesQueryBuilder.updates(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) => {
                  const cte = tx
                    .$with(`${getViewName(activeAuthorizedView)}_updates`)
                    .as(
                      qb
                        .innerJoin(
                          activeAuthorizedView,
                          and(
                            eq(entriesTable.entityId, activeAuthorizedView.id),
                            not(
                              eq(
                                entriesTable.entityVersion,
                                activeAuthorizedView.version,
                              ),
                            ),
                            eq(
                              entriesTable.tenantId,
                              activeAuthorizedView.tenantId,
                            ),
                          ),
                        )
                        .where(
                          and(
                            eq(activeAuthorizedView.memberId, memberId),
                            eq(
                              activeAuthorizedView.tenantId,
                              clientView.tenantId,
                            ),
                          ),
                        ),
                    );

                  return tx
                    .with(cte)
                    .select(cte[getViewName(activeAuthorizedView)])
                    .from(cte);
                }),
              ),
            ),
        );

        const findDeletes = Effect.fn(
          "SharedAccounts.CustomerGroupAccessRepository.findDeletes",
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
          "SharedAccounts.CustomerGroupAccessRepository.findActiveDeletes",
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

        const findActiveAuthorizedDeletes = Effect.fn(
          "SharedAccounts.CustomerGroupAccessRepository.findActiveAuthorizedDeletes",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            memberId: SharedAccountCustomerGroupAccessSchema.ActiveAuthorizedRow["memberId"],
          ) =>
            entriesQueryBuilder.deletes(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) =>
                  qb.except(
                    tx
                      .select({ id: activeAuthorizedView.id })
                      .from(activeAuthorizedView)
                      .where(
                        and(
                          eq(activeAuthorizedView.memberId, memberId),
                          eq(
                            activeAuthorizedView.tenantId,
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
          "SharedAccounts.CustomerGroupAccessRepository.findFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<SharedAccountCustomerGroupAccessSchema.Row["id"]>,
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
          "SharedAccounts.CustomerGroupAccessRepository.findActiveFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<
              SharedAccountCustomerGroupAccessSchema.ActiveRow["id"]
            >,
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

        const findActiveAuthorizedFastForward = Effect.fn(
          "SharedAccounts.CustomerGroupAccessRepository.findActiveAuthorizedFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<
              SharedAccountCustomerGroupAccessSchema.ActiveAuthorizedRow["id"]
            >,
            memberId: SharedAccountCustomerGroupAccessSchema.ActiveAuthorizedRow["memberId"],
          ) =>
            entriesQueryBuilder
              .fastForward(getTableName(table), clientView)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(
                        `${getViewName(activeAuthorizedView)}_fast_forward`,
                      )
                      .as(
                        qb
                          .innerJoin(
                            activeAuthorizedView,
                            and(
                              eq(
                                entriesTable.entityId,
                                activeAuthorizedView.id,
                              ),
                              notInArray(activeAuthorizedView.id, excludeIds),
                            ),
                          )
                          .where(
                            and(
                              eq(activeAuthorizedView.memberId, memberId),
                              eq(
                                activeAuthorizedView.tenantId,
                                clientView.tenantId,
                              ),
                            ),
                          ),
                      );

                    return tx
                      .with(cte)
                      .select(cte[getViewName(activeAuthorizedView)])
                      .from(cte);
                  }),
                ),
              ),
        );

        return {
          upsertMany,
          findCreates,
          findActiveCreates,
          findActiveAuthorizedCreates,
          findUpdates,
          findActiveUpdates,
          findActiveAuthorizedUpdates,
          findDeletes,
          findActiveDeletes,
          findActiveAuthorizedDeletes,
          findFastForward,
          findActiveFastForward,
          findActiveAuthorizedFastForward,
        } as const;
      }),
    },
  ) {}

  export class CustomerGroupAccessQueries extends Effect.Service<CustomerGroupAccessQueries>()(
    "@printdesk/core/shared-accounts/CustomerGroupAccessQueries",
    {
      accessors: true,
      dependencies: [CustomerGroupAccessRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* CustomerGroupAccessRepository;

        const differenceResolver =
          new QueriesContract.DifferenceResolverBuilder(
            getTableName(
              SharedAccountCustomerGroupAccessSchema.table.definition,
            ),
          )
            .query(
              AccessControl.permission(
                "shared_account_customer_group_access:read",
              ),
              {
                findCreates: repository.findCreates,
                findUpdates: repository.findUpdates,
                findDeletes: repository.findDeletes,
                fastForward: repository.findFastForward,
              },
            )
            .query(
              AccessControl.permission(
                "active_shared_account_customer_group_access:read",
              ),
              {
                findCreates: repository.findActiveCreates,
                findUpdates: repository.findActiveUpdates,
                findDeletes: repository.findActiveDeletes,
                fastForward: repository.findActiveFastForward,
              },
            )
            .query(
              AccessControl.permission(
                "active_authorized_shared_account_customer_group_access:read",
              ),
              {
                findCreates: repository.findActiveAuthorizedCreates,
                findUpdates: repository.findActiveAuthorizedUpdates,
                findDeletes: repository.findActiveAuthorizedDeletes,
                fastForward: repository.findActiveAuthorizedFastForward,
              },
            )
            .build();

        return { differenceResolver } as const;
      }),
    },
  ) {}
}
