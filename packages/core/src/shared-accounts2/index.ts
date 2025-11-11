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

import { AccessControl } from "../access-control2";
import { Database } from "../database2";
import { Events } from "../events2";
import { MutationsContract } from "../mutations/contract";
import { Permissions } from "../permissions2";
import { PoliciesContract } from "../policies/contract";
import { QueriesContract } from "../queries/contract";
import { Replicache } from "../replicache2";
import { ReplicacheNotifier } from "../replicache2/notifier";
import { ReplicacheClientViewEntriesSchema } from "../replicache2/schemas";
import {
  SharedAccountCustomerAuthorizationsContract,
  SharedAccountManagerAuthorizationsContract,
  SharedAccountsContract,
} from "./contracts";
import {
  SharedAccountCustomerAuthorizationsSchema,
  SharedAccountManagerAuthorizationsSchema,
  SharedAccountsSchema,
} from "./schemas";

import type { InferInsertModel } from "drizzle-orm";
import type { ReplicacheClientViewsSchema } from "../replicache2/schemas";

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
            customerId: SharedAccountsSchema.ActiveCustomerAuthorizedRow["authorizedCustomerId"],
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
                            "authorizedCustomerId",
                          ),
                        )
                        .from(activeCustomerAuthorizedView)
                        .where(
                          and(
                            eq(
                              activeCustomerAuthorizedView.authorizedCustomerId,
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
            managerId: SharedAccountsSchema.ActiveManagerAuthorizedRow["authorizedManagerId"],
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
                            "authorizedManagerId",
                          ),
                        )
                        .from(activeManagerAuthorizedView)
                        .where(
                          and(
                            eq(
                              activeManagerAuthorizedView.authorizedManagerId,
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
            customerId: SharedAccountsSchema.ActiveCustomerAuthorizedRow["authorizedCustomerId"],
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
                              activeCustomerAuthorizedView.authorizedCustomerId,
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
                        "authorizedCustomerId",
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
            managerId: SharedAccountsSchema.ActiveManagerAuthorizedRow["authorizedManagerId"],
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
                              activeManagerAuthorizedView.authorizedManagerId,
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
                        "authorizedManagerId",
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
            customerId: SharedAccountsSchema.ActiveCustomerAuthorizedRow["authorizedCustomerId"],
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
                            activeCustomerAuthorizedView.authorizedCustomerId,
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
            managerId: SharedAccountsSchema.ActiveManagerAuthorizedRow["authorizedManagerId"],
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
                          eq(
                            activeManagerAuthorizedView.authorizedManagerId,
                            managerId,
                          ),
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
            customerId: SharedAccountsSchema.ActiveCustomerAuthorizedRow["authorizedCustomerId"],
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
                                entriesTable.entity,
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
                                activeCustomerAuthorizedView.authorizedCustomerId,
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
                          "authorizedCustomerId",
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
            managerId: SharedAccountsSchema.ActiveManagerAuthorizedRow["authorizedManagerId"],
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
                                activeManagerAuthorizedView.authorizedManagerId,
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
                          "authorizedManagerId",
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
                    customerId:
                      activeCustomerAuthorizedView.authorizedCustomerId,
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
                    managerId: activeManagerAuthorizedView.authorizedManagerId,
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
          new QueriesContract.DifferenceResolverBuilder({
            entity: getTableName(SharedAccountsSchema.table.definition),
          })
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
              AccessControl.policy((principal) =>
                repository
                  .findActiveAuthorizedCustomerIds(id, principal.tenantId)
                  .pipe(
                    Effect.map(
                      Array.some(Equal.equals(customerId ?? principal.userId)),
                    ),
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
                AccessControl.policy((principal) =>
                  repository
                    .findActiveAuthorizedManagerIds(id, principal.tenantId)
                    .pipe(
                      Effect.map(
                        Array.some(Equal.equals(managerId ?? principal.userId)),
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
      dependencies: [
        Repository.Default,
        Policies.Default,
        Permissions.Schemas.Default,
      ],
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
              ({ id, ...sharedAccount }, session) =>
                repository
                  .updateById(id, sharedAccount, session.tenantId)
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
              ({ id, deletedAt }, session) =>
                repository
                  .updateById(id, { deletedAt }, session.tenantId)
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
              ({ id }, session) =>
                repository
                  .updateById(id, { deletedAt: null }, session.tenantId)
                  .pipe(Effect.tap(notifyRestore)),
            ),
          },
        );

        return { edit, delete: delete_, restore } as const;
      }),
    },
  ) {}

  export class CustomerAuthorizationsRepository extends Effect.Service<CustomerAuthorizationsRepository>()(
    "@printdesk/core/shared-accounts/CustomerAuthorizationsRepository",
    {
      dependencies: [
        Database.TransactionManager.Default,
        Replicache.ClientViewEntriesQueryBuilder.Default,
      ],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table =
          SharedAccountCustomerAuthorizationsSchema.table.definition;
        const activeView = SharedAccountCustomerAuthorizationsSchema.activeView;
        const activeAuthorizedView =
          SharedAccountCustomerAuthorizationsSchema.activeAuthorizedView;

        const entriesQueryBuilder =
          yield* Replicache.ClientViewEntriesQueryBuilder;
        const entriesTable = ReplicacheClientViewEntriesSchema.table.definition;

        const upsertMany = Effect.fn(
          "SharedAccounts.CustomerAuthorizationsRepository.upsertMany",
        )(
          (
            values: Array<
              InferInsertModel<SharedAccountCustomerAuthorizationsSchema.Table>
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
                  set: SharedAccountCustomerAuthorizationsSchema.table
                    .conflictSet,
                })
                .returning(),
            ),
        );

        const findCreates = Effect.fn(
          "SharedAccounts.CustomerAuthorizationsRepository.findCreates",
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
          "SharedAccounts.CustomerAuthorizationsRepository.findActiveCreates",
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
          "SharedAccounts.CustomerAuthorizationsRepository.findActiveAuthorizedCreates",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            customerId: SharedAccountCustomerAuthorizationsSchema.ActiveAuthorizedRow["customerId"],
          ) =>
            entriesQueryBuilder.creates(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) => {
                  const cte = tx
                    .$with(
                      `${SharedAccountCustomerAuthorizationsContract.activeAuthorizedViewName}_creates`,
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
          "SharedAccounts.CustomerAuthorizationsRepository.findUpdates",
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
          "SharedAccounts.CustomerAuthorizationsRepository.findActiveUpdates",
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
          "SharedAccounts.CustomerAuthorizationsRepository.findActiveAuthorizedUpdates",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            customerId: SharedAccountCustomerAuthorizationsSchema.ActiveAuthorizedRow["customerId"],
          ) =>
            entriesQueryBuilder.updates(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) => {
                  const cte = tx
                    .$with(
                      `${SharedAccountCustomerAuthorizationsContract.activeAuthorizedViewName}_updates`,
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
          "SharedAccounts.CustomerAuthorizationsRepository.findDeletes",
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
          "SharedAccounts.CustomerAuthorizationsRepository.findActiveDeletes",
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
            customerId: SharedAccountCustomerAuthorizationsSchema.ActiveAuthorizedRow["customerId"],
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
            excludeIds: Array<
              SharedAccountCustomerAuthorizationsSchema.Row["id"]
            >,
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
              SharedAccountCustomerAuthorizationsSchema.ActiveRow["id"]
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
              SharedAccountCustomerAuthorizationsSchema.ActiveAuthorizedRow["id"]
            >,
            customerId: SharedAccountCustomerAuthorizationsSchema.ActiveAuthorizedRow["customerId"],
          ) =>
            entriesQueryBuilder
              .fastForward(getTableName(table), clientView)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(
                        `${SharedAccountCustomerAuthorizationsContract.activeAuthorizedViewName}_fast_forward`,
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
          "SharedAccounts.CustomerAuthorizationsRepository.findByOrigin",
        )(
          <TSharedAccountOrigin extends SharedAccountsSchema.Row["origin"]>(
            origin: TSharedAccountOrigin,
            tenantId: SharedAccountCustomerAuthorizationsSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .select({ customerAuthorization: table })
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
              .pipe(
                Effect.map(
                  Array.map(
                    ({ customerAuthorization }) => customerAuthorization,
                  ),
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
          findByOrigin,
        } as const;
      }),
    },
  ) {}

  export class CustomerAuthorizationsQueries extends Effect.Service<CustomerAuthorizationsQueries>()(
    "@printdesk/core/shared-accounts/CustomerAuthorizationsQueries",
    {
      accessors: true,
      dependencies: [CustomerAuthorizationsRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* CustomerAuthorizationsRepository;

        const differenceResolver =
          new QueriesContract.DifferenceResolverBuilder({
            entity: getTableName(
              SharedAccountCustomerAuthorizationsSchema.table.definition,
            ),
          })
            .query(
              AccessControl.permission(
                "shared_account_customer_authorizations:read",
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
                "active_shared_account_customer_authorizations:read",
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
                "active_authorized_shared_account_customer_authorizations:read",
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

  export class ManagerAuthorizationsRepository extends Effect.Service<ManagerAuthorizationsRepository>()(
    "@printdesk/core/shared-accounts/ManagerAuthorizationsRepository",
    {
      dependencies: [
        Database.TransactionManager.Default,
        Replicache.ClientViewEntriesQueryBuilder.Default,
      ],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = SharedAccountManagerAuthorizationsSchema.table.definition;
        const activeView = SharedAccountManagerAuthorizationsSchema.activeView;
        const activeCustomerAuthorizedView =
          SharedAccountManagerAuthorizationsSchema.activeCustomerAuthorizedView;

        const entriesQueryBuilder =
          yield* Replicache.ClientViewEntriesQueryBuilder;
        const entriesTable = ReplicacheClientViewEntriesSchema.table.definition;

        const create = Effect.fn(
          "SharedAccounts.ManagerAuthorizationsRepository.create",
        )(
          (
            authorization: InferInsertModel<SharedAccountManagerAuthorizationsSchema.Table>,
          ) =>
            db
              .useTransaction((tx) =>
                tx.insert(table).values(authorization).returning(),
              )
              .pipe(
                Effect.flatMap(Array.head),
                Effect.catchTag("NoSuchElementException", Effect.die),
              ),
        );

        const findCreates = Effect.fn(
          "SharedAccounts.ManagerAuthorizationsRepository.findCreates",
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
          "SharedAccounts.ManagerAuthorizationsRepository.findActiveCreates",
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
          "SharedAccounts.ManagerAuthorizationsRepository.findActiveAuthorizedCreates",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            managerId: SharedAccountManagerAuthorizationsSchema.Row["managerId"],
          ) =>
            entriesQueryBuilder.creates(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) => {
                  const cte = tx
                    .$with(
                      `${SharedAccountManagerAuthorizationsContract.activeAuthorizedViewName}_creates`,
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
          "SharedAccounts.ManagerAuthorizationsRepository.findActiveCustomerAuthorizedCreates",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            customerId: SharedAccountCustomerAuthorizationsSchema.Row["customerId"],
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
                            "authorizedCustomerId",
                          ),
                        )
                        .from(activeCustomerAuthorizedView)
                        .where(
                          and(
                            eq(
                              activeCustomerAuthorizedView.authorizedCustomerId,
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
          "SharedAccounts.ManagerAuthorizationsRepository.findUpdates",
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
          "SharedAccounts.ManagerAuthorizationsRepository.findActiveUpdates",
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
          "SharedAccounts.ManagerAuthorizationsRepository.findActiveAuthorizedUpdates",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            managerId: SharedAccountManagerAuthorizationsSchema.Row["managerId"],
          ) =>
            entriesQueryBuilder.updates(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) => {
                  const cte = tx
                    .$with(
                      `${SharedAccountManagerAuthorizationsContract.activeAuthorizedViewName}_updates`,
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
          "SharedAccounts.ManagerAuthorizationsRepository.findActiveCustomerAuthorizedUpdates",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            customerId: SharedAccountCustomerAuthorizationsSchema.Row["customerId"],
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
                              activeCustomerAuthorizedView.authorizedCustomerId,
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
                        "authorizedCustomerId",
                      ),
                    )
                    .from(cte);
                }),
              ),
            ),
        );

        const findDeletes = Effect.fn(
          "SharedAccounts.ManagerAuthorizationsRepository.findDeletes",
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
          "SharedAccounts.ManagerAuthorizationsRepository.findActiveDeletes",
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
          "SharedAccounts.ManagerAuthorizationsRepository.findActiveAuthorizedDeletes",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            managerId: SharedAccountManagerAuthorizationsSchema.Row["managerId"],
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
          "SharedAccounts.ManagerAuthorizationsRepository.findActiveCustomerAuthorizedDeletes",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            customerId: SharedAccountCustomerAuthorizationsSchema.Row["customerId"],
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
                            activeCustomerAuthorizedView.authorizedCustomerId,
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
          "SharedAccounts.ManagerAuthorizationsRepository.findFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<
              SharedAccountManagerAuthorizationsSchema.Row["id"]
            >,
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
          "SharedAccounts.ManagerAuthorizationsRepository.findActiveFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<
              SharedAccountManagerAuthorizationsSchema.Row["id"]
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
          "SharedAccounts.ManagerAuthorizationsRepository.findActiveAuthorizedFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<
              SharedAccountManagerAuthorizationsSchema.Row["id"]
            >,
            managerId: SharedAccountManagerAuthorizationsSchema.Row["managerId"],
          ) =>
            entriesQueryBuilder
              .fastForward(getTableName(table), clientView)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(
                        `${SharedAccountManagerAuthorizationsContract.activeAuthorizedViewName}_fast_forward`,
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
          "SharedAccounts.ManagerAuthorizationsRepository.findActiveCustomerAuthorizedFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<
              SharedAccountManagerAuthorizationsSchema.Row["id"]
            >,
            customerId: SharedAccountCustomerAuthorizationsSchema.Row["customerId"],
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
                                activeCustomerAuthorizedView.authorizedCustomerId,
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
                          "authorizedCustomerId",
                        ),
                      )
                      .from(cte);
                  }),
                ),
              ),
        );

        const findById = Effect.fn(
          "SharedAccounts.ManagerAuthorizationsRepository.findById",
        )(
          (
            id: SharedAccountManagerAuthorizationsSchema.Row["id"],
            tenantId: SharedAccountManagerAuthorizationsSchema.Row["tenantId"],
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
          "SharedAccounts.ManagerAuthorizationsRepository.updateById",
        )(
          (
            id: SharedAccountManagerAuthorizationsSchema.Row["id"],
            authorization: Partial<
              Omit<
                SharedAccountManagerAuthorizationsSchema.Row,
                "id" | "tenantId"
              >
            >,
            tenantId: SharedAccountManagerAuthorizationsSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .update(table)
                  .set(authorization)
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

  export class ManagerAuthorizationsQueries extends Effect.Service<ManagerAuthorizationsQueries>()(
    "@printdesk/core/shared-accounts/ManagerAuthorizationsQueries",
    {
      accessors: true,
      dependencies: [ManagerAuthorizationsRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* ManagerAuthorizationsRepository;

        const differenceResolver =
          new QueriesContract.DifferenceResolverBuilder({
            entity: getTableName(
              SharedAccountManagerAuthorizationsSchema.table.definition,
            ),
          })
            .query(
              AccessControl.permission(
                "shared_account_manager_authorizations:read",
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
                "active_shared_account_manager_authorizations:read",
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
                "active_shared_account_manager_authorizations:read",
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
                "active_authorized_shared_account_manager_authorizations:read",
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

  export class ManagerAuthorizationPolicies extends Effect.Service<ManagerAuthorizationPolicies>()(
    "@printdesk/core/shared-accounts/ManagerAuthorizationPolicies",
    {
      accessors: true,
      dependencies: [ManagerAuthorizationsRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* ManagerAuthorizationsRepository;

        const canDelete = PoliciesContract.makePolicy(
          SharedAccountManagerAuthorizationsContract.canDelete,
          {
            make: Effect.fn(
              "SharedAccounts.ManagerAuthorizationPolicies.canDelete.make",
            )(({ id }) =>
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

        const canRestore = PoliciesContract.makePolicy(
          SharedAccountManagerAuthorizationsContract.canRestore,
          {
            make: Effect.fn(
              "SharedAccounts.ManagerAuthorizationPolicies.canRestore.make",
            )(({ id }) =>
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

        return { canDelete, canRestore } as const;
      }),
    },
  ) {}

  export class ManagerAuthorizationMutations extends Effect.Service<ManagerAuthorizationMutations>()(
    "@printdesk/core/shared-accounts/ManagerAuthorizationMutations",
    {
      accessors: true,
      dependencies: [
        ManagerAuthorizationsRepository.Default,
        ManagerAuthorizationPolicies.Default,
        Permissions.Schemas.Default,
      ],
      effect: Effect.gen(function* () {
        const repository = yield* ManagerAuthorizationsRepository;

        const policies = yield* ManagerAuthorizationPolicies;

        const notifier = yield* ReplicacheNotifier;
        const PullPermission = yield* Events.ReplicachePullPermission;

        const notifyCreate = (
          authorization: SharedAccountManagerAuthorizationsContract.DataTransferObject,
        ) =>
          notifier.notify(
            Array.make(
              PullPermission.make({
                permission: "shared_account_manager_authorizations:read",
              }),
              PullPermission.make({
                permission: "active_shared_account_manager_authorizations:read",
              }),
              Events.makeReplicachePullPolicy(
                SharedAccountsContract.isCustomerAuthorized.make({
                  id: authorization.sharedAccountId,
                }),
              ),
              Events.makeReplicachePullPolicy(
                SharedAccountsContract.isManagerAuthorized.make({
                  id: authorization.sharedAccountId,
                }),
              ),
            ),
          );
        const notifyDelete = notifyCreate;
        const notifyRestore = notifyCreate;

        const create = MutationsContract.makeMutation(
          SharedAccountManagerAuthorizationsContract.create,
          {
            makePolicy: Effect.fn(
              "SharedAccounts.ManagerAuthorizationMutations.create.makePolicy",
            )(() =>
              AccessControl.permission(
                "shared_account_manager_authorizations:create",
              ),
            ),
            mutator: Effect.fn(
              "SharedAccounts.ManagerAuthorizationMutations.create.mutator",
            )((authorization, { tenantId }) =>
              repository
                .create({ ...authorization, tenantId })
                .pipe(Effect.tap(notifyCreate)),
            ),
          },
        );

        const delete_ = MutationsContract.makeMutation(
          SharedAccountManagerAuthorizationsContract.delete_,
          {
            makePolicy: Effect.fn(
              "SharedAccounts.ManagerAuthorizationMutations.delete.makePolicy",
            )(({ id }) =>
              AccessControl.every(
                AccessControl.permission(
                  "shared_account_manager_authorizations:delete",
                ),
                policies.canDelete.make({ id }),
              ),
            ),
            mutator: Effect.fn(
              "SharedAccounts.ManagerAuthorizationMutations.delete.mutator",
            )(({ id, deletedAt }, session) =>
              repository
                .updateById(id, { deletedAt }, session.tenantId)
                .pipe(Effect.tap(notifyDelete)),
            ),
          },
        );

        const restore = MutationsContract.makeMutation(
          SharedAccountManagerAuthorizationsContract.restore,
          {
            makePolicy: Effect.fn(
              "SharedAccounts.ManagerAuthorizationMutations.restore.makePolicy",
            )(({ id }) =>
              AccessControl.every(
                AccessControl.permission(
                  "shared_account_manager_authorizations:delete",
                ),
                policies.canRestore.make({ id }),
              ),
            ),
            mutator: Effect.fn(
              "SharedAccounts.ManagerAuthorizationMutations.restore.mutator",
            )(({ id }, session) =>
              repository
                .updateById(id, { deletedAt: null }, session.tenantId)
                .pipe(Effect.tap(notifyRestore)),
            ),
          },
        );

        return { create, delete: delete_, restore } as const;
      }),
    },
  ) {}
}
