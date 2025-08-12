import {
  and,
  eq,
  getTableName,
  getViewName,
  getViewSelectedFields,
  inArray,
  not,
  notInArray,
  or,
} from "drizzle-orm";
import { Array, Effect } from "effect";

import { AccessControl } from "../access-control2";
import { DataAccessContract } from "../data-access2/contract";
import { Database } from "../database2";
import { buildConflictSet } from "../database2/constructors";
import { Replicache } from "../replicache2";
import { replicacheClientViewMetadataTable } from "../replicache2/sql";
import { activeUsersView } from "../users2/sql";
import {
  BillingAccountManagerAuthorizationsContract,
  BillingAccountsContract,
} from "./contracts";
import {
  activeBillingAccountCustomerAuthorizationsView,
  activeBillingAccountManagerAuthorizationsView,
  activeBillingAccountsView,
  billingAccountCustomerAuthorizationsTable,
  billingAccountManagerAuthorizationsTable,
  billingAccountsTable,
} from "./sql";

import type { InferInsertModel } from "drizzle-orm";
import type { ReplicacheClientViewMetadata } from "../replicache2/sql";
import type {
  BillingAccount,
  BillingAccountCustomerAuthorization,
  BillingAccountCustomerAuthorizationsTable,
  BillingAccountManagerAuthorization,
  BillingAccountManagerAuthorizationsTable,
  BillingAccountsTable,
} from "./sql";

export namespace BillingAccounts {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/billing-accounts/Repository",
    {
      dependencies: [
        Database.TransactionManager.Default,
        Replicache.ClientViewMetadataQueryBuilder.Default,
      ],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = billingAccountsTable;
        const activeView = activeBillingAccountsView;
        const activeCustomerAuthorizationsView =
          activeBillingAccountCustomerAuthorizationsView;
        const activeManagerAuthorizationsView =
          activeBillingAccountManagerAuthorizationsView;

        const metadataQb = yield* Replicache.ClientViewMetadataQueryBuilder;
        const metadataTable = replicacheClientViewMetadataTable;

        const upsertMany = Effect.fn("BillingAccounts.Repository.upsertMany")(
          (values: Array<InferInsertModel<BillingAccountsTable>>) =>
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
                    set: buildConflictSet(table),
                  })
                  .returning(),
              )
              .pipe(
                Effect.flatMap(Array.head),
                Effect.catchTag("NoSuchElementException", Effect.die),
              ),
        );

        const findCreates = Effect.fn("BillingAccounts.Repository.findCreates")(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: BillingAccount["tenantId"],
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
          "BillingAccounts.Repository.findActiveCreates",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: BillingAccount["tenantId"],
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

        const findActiveCreatesByCustomerId = Effect.fn(
          "BillingAccounts.Repository.findActiveCreatesByCustomerId",
        )(
          (
            customerId: BillingAccountCustomerAuthorization["customerId"],
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: BillingAccount["tenantId"],
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
                      .$with(`${getViewName(activeView)}_creates_by_customer`)
                      .as(
                        tx
                          .select(getViewSelectedFields(activeView))
                          .from(activeView)
                          .innerJoin(
                            activeCustomerAuthorizationsView,
                            and(
                              eq(
                                activeView.id,
                                activeCustomerAuthorizationsView.billingAccountId,
                              ),
                              eq(
                                activeView.tenantId,
                                activeCustomerAuthorizationsView.tenantId,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(
                                activeCustomerAuthorizationsView.customerId,
                                customerId,
                              ),
                              eq(activeView.tenantId, tenantId),
                            ),
                          ),
                      );

                    return tx
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

        const findUpdates = Effect.fn("BillingAccounts.Repository.findUpdates")(
          (
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: BillingAccount["tenantId"],
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

                    return tx.select(cte[getTableName(table)]).from(cte);
                  }),
                ),
              ),
        );

        const findActiveUpdates = Effect.fn(
          "BillingAccounts.Repository.findActiveUpdates",
        )(
          (
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: BillingAccount["tenantId"],
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

                    return tx.select(cte[getViewName(activeView)]).from(cte);
                  }),
                ),
              ),
        );

        const findActiveUpdatesByCustomerId = Effect.fn(
          "BillingAccounts.Repository.findActiveUpdatesByCustomerId",
        )(
          (
            customerId: BillingAccountCustomerAuthorization["customerId"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: BillingAccount["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getViewName(activeView)}_updates_by_customer`)
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
                          .innerJoin(
                            activeCustomerAuthorizationsView,
                            and(
                              eq(
                                activeView.id,
                                activeCustomerAuthorizationsView.billingAccountId,
                              ),
                              eq(
                                activeView.tenantId,
                                activeCustomerAuthorizationsView.tenantId,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(
                                activeCustomerAuthorizationsView.customerId,
                                customerId,
                              ),
                              eq(activeView.tenantId, tenantId),
                            ),
                          ),
                      );

                    return tx.select(cte[getViewName(activeView)]).from(cte);
                  }),
                ),
              ),
        );

        const findDeletes = Effect.fn("BillingAccounts.Repository.findDeletes")(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: BillingAccount["tenantId"],
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
          "BillingAccounts.Repository.findActiveDeletes",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: BillingAccount["tenantId"],
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

        const findActiveDeletesByCustomerId = Effect.fn(
          "BillingAccounts.Repository.findActiveDeletesByCustomerId",
        )(
          (
            customerId: BillingAccountCustomerAuthorization["customerId"],
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: BillingAccount["tenantId"],
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
                        .innerJoin(
                          activeCustomerAuthorizationsView,
                          and(
                            eq(
                              activeView.id,
                              activeCustomerAuthorizationsView.billingAccountId,
                            ),
                            eq(
                              activeView.tenantId,
                              activeCustomerAuthorizationsView.tenantId,
                            ),
                          ),
                        )
                        .where(
                          and(
                            eq(
                              activeCustomerAuthorizationsView.customerId,
                              customerId,
                            ),
                            eq(activeView.tenantId, tenantId),
                          ),
                        ),
                    ),
                  ),
                ),
              ),
        );

        const findFastForward = Effect.fn(
          "BillingAccounts.Repository.findFastForward",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: BillingAccount["tenantId"],
            excludeIds: Array<BillingAccount["id"]>,
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
                              eq(metadataTable.entity, table.id),
                              notInArray(table.id, excludeIds),
                            ),
                          )
                          .where(eq(table.tenantId, tenantId)),
                      );

                    return tx.select(cte[getTableName(table)]).from(cte);
                  }),
                ),
              ),
        );

        const findActiveFastForward = Effect.fn(
          "BillingAccounts.Repository.findActiveFastForward",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: BillingAccount["tenantId"],
            excludeIds: Array<BillingAccount["id"]>,
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
                              eq(metadataTable.entity, activeView.id),
                              notInArray(activeView.id, excludeIds),
                            ),
                          )
                          .where(eq(activeView.tenantId, tenantId)),
                      );

                    return tx.select(cte[getViewName(activeView)]).from(cte);
                  }),
                ),
              ),
        );

        const findActiveFastForwardByCustomerId = Effect.fn(
          "BillingAccounts.Repository.findActiveFastForwardByCustomerId",
        )(
          (
            customerId: BillingAccountCustomerAuthorization["customerId"],
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: BillingAccount["tenantId"],
            excludeIds: Array<BillingAccount["id"]>,
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
                              eq(metadataTable.entity, activeView.id),
                              notInArray(activeView.id, excludeIds),
                            ),
                          )
                          .innerJoin(
                            activeCustomerAuthorizationsView,
                            and(
                              eq(
                                activeView.id,
                                activeCustomerAuthorizationsView.billingAccountId,
                              ),
                              eq(
                                activeView.tenantId,
                                activeCustomerAuthorizationsView.tenantId,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(
                                activeCustomerAuthorizationsView.customerId,
                                customerId,
                              ),
                              eq(activeView.tenantId, tenantId),
                            ),
                          ),
                      );

                    return tx.select(cte[getViewName(activeView)]).from(cte);
                  }),
                ),
              ),
        );

        const findByOrigin = Effect.fn(
          "BillingAccounts.Repository.findByOrigin",
        )(
          <TBillingAccountOrigin extends BillingAccount["origin"]>(
            origin: TBillingAccountOrigin,
            tenantId: BillingAccount["tenantId"],
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

        const findActiveCustomerIds = Effect.fn(
          "BillingAccounts.Repository.findActiveCustomerIds",
        )((id: BillingAccount["id"], tenantId: BillingAccount["tenantId"]) =>
          db
            .useTransaction((tx) =>
              tx
                .select({ id: activeUsersView.id })
                .from(activeView)
                .innerJoin(
                  activeCustomerAuthorizationsView,
                  and(
                    eq(
                      activeView.id,
                      activeCustomerAuthorizationsView.billingAccountId,
                    ),
                    eq(
                      activeView.tenantId,
                      activeCustomerAuthorizationsView.tenantId,
                    ),
                  ),
                )
                .innerJoin(
                  activeUsersView,
                  and(
                    eq(
                      activeCustomerAuthorizationsView.customerId,
                      activeUsersView.id,
                    ),
                    eq(
                      activeCustomerAuthorizationsView.tenantId,
                      activeUsersView.tenantId,
                    ),
                  ),
                )
                .where(
                  and(eq(activeView.id, id), eq(activeView.tenantId, tenantId)),
                ),
            )
            .pipe(Effect.map(Array.map(({ id }) => id))),
        );

        const findActiveManagerIds = Effect.fn(
          "BillingAccounts.Repository.findActiveManagerIds",
        )((id: BillingAccount["id"], tenantId: BillingAccount["tenantId"]) =>
          db
            .useTransaction((tx) =>
              tx
                .select({ id: activeUsersView.id })
                .from(activeView)
                .innerJoin(
                  activeManagerAuthorizationsView,
                  and(
                    eq(
                      activeView.id,
                      activeManagerAuthorizationsView.billingAccountId,
                    ),
                    eq(
                      activeView.tenantId,
                      activeManagerAuthorizationsView.tenantId,
                    ),
                  ),
                )
                .innerJoin(
                  activeUsersView,
                  and(
                    eq(
                      activeManagerAuthorizationsView.managerId,
                      activeUsersView.id,
                    ),
                    eq(
                      activeManagerAuthorizationsView.tenantId,
                      activeUsersView.tenantId,
                    ),
                  ),
                )
                .where(
                  and(eq(activeView.id, id), eq(activeView.tenantId, tenantId)),
                ),
            )
            .pipe(Effect.map(Array.map(({ id }) => id))),
        );

        const findActiveAuthorizedUserIds = Effect.fn(
          "BillingAccounts.Repository.findActiveAuthorizedUserIds",
        )((id: BillingAccount["id"], tenantId: BillingAccount["tenantId"]) =>
          db
            .useTransaction((tx) =>
              tx
                .select({ id: activeUsersView.id })
                .from(activeView)
                .innerJoin(
                  activeCustomerAuthorizationsView,
                  and(
                    eq(
                      activeView.id,
                      activeCustomerAuthorizationsView.billingAccountId,
                    ),
                    eq(
                      activeView.tenantId,
                      activeCustomerAuthorizationsView.tenantId,
                    ),
                  ),
                )
                .innerJoin(
                  activeManagerAuthorizationsView,
                  and(
                    eq(
                      activeView.id,
                      activeManagerAuthorizationsView.billingAccountId,
                    ),
                    eq(
                      activeView.tenantId,
                      activeManagerAuthorizationsView.tenantId,
                    ),
                  ),
                )
                .innerJoin(
                  activeUsersView,
                  or(
                    and(
                      eq(
                        activeCustomerAuthorizationsView.customerId,
                        activeUsersView.id,
                      ),
                      eq(
                        activeCustomerAuthorizationsView.tenantId,
                        activeUsersView.tenantId,
                      ),
                    ),
                    and(
                      eq(
                        activeManagerAuthorizationsView.managerId,
                        activeUsersView.id,
                      ),
                      eq(
                        activeManagerAuthorizationsView.tenantId,
                        activeUsersView.tenantId,
                      ),
                    ),
                  ),
                )
                .where(
                  and(eq(activeView.id, id), eq(activeView.tenantId, tenantId)),
                ),
            )
            .pipe(Effect.map(Array.map(({ id }) => id))),
        );

        const updateById = Effect.fn("BillingAccounts.Repository.updateById")(
          (
            id: BillingAccount["id"],
            billingAccount: Partial<Omit<BillingAccount, "id" | "tenantId">>,
            tenantId: BillingAccount["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .update(table)
                  .set(billingAccount)
                  .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
                  .returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const deleteById = Effect.fn("BillingAccounts.Repository.deleteById")(
          (
            id: BillingAccount["id"],
            deletedAt: NonNullable<BillingAccount["deletedAt"]>,
            tenantId: BillingAccount["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .update(table)
                  .set({ deletedAt })
                  .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
                  .returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        return {
          upsertMany,
          findCreates,
          findActiveCreates,
          findActiveCreatesByCustomerId,
          findUpdates,
          findActiveUpdates,
          findActiveUpdatesByCustomerId,
          findDeletes,
          findActiveDeletes,
          findActiveDeletesByCustomerId,
          findFastForward,
          findActiveFastForward,
          findActiveFastForwardByCustomerId,
          findByOrigin,
          findActiveCustomerIds,
          findActiveManagerIds,
          findActiveAuthorizedUserIds,
          updateById,
          deleteById,
        } as const;
      }),
    },
  ) {}

  export class Policies extends Effect.Service<Policies>()(
    "@printdesk/core/billing-accounts/Policies",
    {
      accessors: true,
      dependencies: [Repository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const hasActiveManagerAuthorization =
          yield* DataAccessContract.makePolicy(
            BillingAccountsContract.hasActiveManagerAuthorization,
            Effect.succeed({
              make: ({ id }) =>
                AccessControl.policy((principal) =>
                  repository
                    .findActiveManagerIds(id, principal.tenantId)
                    .pipe(
                      Effect.map(
                        Array.some(
                          (managerId) => managerId === principal.userId,
                        ),
                      ),
                    ),
                ),
            }),
          );

        const hasActiveCustomerAuthorization =
          yield* DataAccessContract.makePolicy(
            BillingAccountsContract.hasActiveCustomerAuthorization,
            Effect.succeed({
              make: ({ id }) =>
                AccessControl.policy((principal) =>
                  repository
                    .findActiveManagerIds(id, principal.tenantId)
                    .pipe(
                      Effect.map(
                        Array.some(
                          (managerId) => managerId === principal.userId,
                        ),
                      ),
                    ),
                ),
            }),
          );

        const hasActiveAuthorization = yield* DataAccessContract.makePolicy(
          BillingAccountsContract.hasActiveAuthorization,
          Effect.succeed({
            make: ({ id }) =>
              AccessControl.policy((principal) =>
                repository
                  .findActiveAuthorizedUserIds(id, principal.tenantId)
                  .pipe(
                    Effect.map(
                      Array.some((userId) => userId === principal.userId),
                    ),
                  ),
              ),
          }),
        );

        return {
          hasActiveManagerAuthorization,
          hasActiveCustomerAuthorization,
          hasActiveAuthorization,
        } as const;
      }),
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/billing-account/Mutations",
    {
      accessors: true,
      dependencies: [Repository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const update = DataAccessContract.makeMutation(
          BillingAccountsContract.update,
          Effect.succeed({
            makePolicy: () =>
              AccessControl.permission("billing_accounts:update"),
            mutator: ({ id, ...billingAccount }, session) =>
              repository.updateById(id, billingAccount, session.tenantId),
          }),
        );

        const delete_ = DataAccessContract.makeMutation(
          BillingAccountsContract.delete_,
          Effect.succeed({
            makePolicy: () =>
              AccessControl.permission("billing_accounts:delete"),
            mutator: ({ id, deletedAt }, session) =>
              repository.deleteById(id, deletedAt, session.tenantId),
          }),
        );

        return { update, delete: delete_ } as const;
      }),
    },
  ) {}

  export class CustomerAuthorizationsRepository extends Effect.Service<CustomerAuthorizationsRepository>()(
    "@printdesk/core/billing-accounts/CustomerAuthorizationsRepository",
    {
      dependencies: [
        Database.TransactionManager.Default,
        Replicache.ClientViewMetadataQueryBuilder.Default,
      ],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = billingAccountCustomerAuthorizationsTable;
        const activeView = activeBillingAccountCustomerAuthorizationsView;

        const metadataQb = yield* Replicache.ClientViewMetadataQueryBuilder;
        const metadataTable = replicacheClientViewMetadataTable;

        const upsertMany = Effect.fn(
          "BillingAccounts.CustomerAuthorizationsRepository.upsertMany",
        )(
          (
            values: Array<
              InferInsertModel<BillingAccountCustomerAuthorizationsTable>
            >,
          ) =>
            db.useTransaction((tx) =>
              tx
                .insert(table)
                .values(values)
                .onConflictDoUpdate({
                  target: [
                    table.customerId,
                    table.billingAccountId,
                    table.tenantId,
                  ],
                  set: buildConflictSet(table),
                })
                .returning(),
            ),
        );

        const findCreates = Effect.fn(
          "BillingAccounts.CustomerAuthorizationsRepository.findCreates",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: BillingAccountCustomerAuthorization["tenantId"],
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
          "BillingAccounts.CustomerAuthorizationsRepository.findActiveCreates",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: BillingAccountCustomerAuthorization["tenantId"],
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

        const findActiveCreatesByCustomerId = Effect.fn(
          "BillingAccounts.CustomerAuthorizationsRepository.findActiveCreatesByCustomerId",
        )(
          (
            customerId: BillingAccountCustomerAuthorization["customerId"],
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: BillingAccountCustomerAuthorization["tenantId"],
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
                      .$with(`${getViewName(activeView)}_creates_by_customer`)
                      .as(
                        tx
                          .select()
                          .from(activeView)
                          .where(
                            and(
                              eq(activeView.customerId, customerId),
                              eq(activeView.tenantId, tenantId),
                            ),
                          ),
                      );

                    return tx
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
          "BillingAccounts.CustomerAuthorizationsRepository.findUpdates",
        )(
          (
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: BillingAccountCustomerAuthorization["tenantId"],
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

                    return tx.select(cte[getTableName(table)]).from(cte);
                  }),
                ),
              ),
        );

        const findActiveUpdates = Effect.fn(
          "BillingAccounts.CustomerAuthorizationsRepository.findActiveUpdates",
        )(
          (
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: BillingAccountCustomerAuthorization["tenantId"],
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

                    return tx.select(cte[getViewName(activeView)]).from(cte);
                  }),
                ),
              ),
        );

        const findActiveUpdatesByCustomerId = Effect.fn(
          "BillingAccounts.CustomerAuthorizationsRepository.findActiveUpdatesByCustomerId",
        )(
          (
            customerId: BillingAccountCustomerAuthorization["customerId"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: BillingAccountCustomerAuthorization["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getViewName(activeView)}_updates_by_customer`)
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
                          .where(
                            and(
                              eq(activeView.customerId, customerId),
                              eq(activeView.tenantId, tenantId),
                            ),
                          ),
                      );

                    return tx.select(cte[getViewName(activeView)]).from(cte);
                  }),
                ),
              ),
        );

        const findDeletes = Effect.fn(
          "BillingAccounts.CustomerAuthorizationsRepository.findDeletes",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: BillingAccountCustomerAuthorization["tenantId"],
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
          "BillingAccounts.CustomerAuthorizationsRepository.findActiveDeletes",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: BillingAccountCustomerAuthorization["tenantId"],
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

        const findActiveDeletesByCustomerId = Effect.fn(
          "BillingAccounts.Repository.findActiveDeletesByCustomerId",
        )(
          (
            customerId: BillingAccountCustomerAuthorization["customerId"],
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: BillingAccountCustomerAuthorization["tenantId"],
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
                        .where(
                          and(
                            eq(activeView.customerId, customerId),
                            eq(activeView.tenantId, tenantId),
                          ),
                        ),
                    ),
                  ),
                ),
              ),
        );

        const findFastForward = Effect.fn(
          "BillingAccounts.Repository.findFastForward",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: BillingAccountCustomerAuthorization["tenantId"],
            excludeIds: Array<BillingAccountCustomerAuthorization["id"]>,
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

                    return tx.select(cte[getTableName(table)]).from(cte);
                  }),
                ),
              ),
        );

        const findActiveFastForward = Effect.fn(
          "BillingAccounts.Repository.findActiveFastForward",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: BillingAccountCustomerAuthorization["tenantId"],
            excludeIds: Array<BillingAccountCustomerAuthorization["id"]>,
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

                    return tx.select(cte[getViewName(activeView)]).from(cte);
                  }),
                ),
              ),
        );

        const findActiveFastForwardByCustomerId = Effect.fn(
          "BillingAccounts.Repository.findActiveFastForwardByCustomerId",
        )(
          (
            customerId: BillingAccountCustomerAuthorization["customerId"],
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: BillingAccountCustomerAuthorization["tenantId"],
            excludeIds: Array<BillingAccountCustomerAuthorization["id"]>,
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
                          .where(
                            and(
                              eq(activeView.customerId, customerId),
                              eq(activeView.tenantId, tenantId),
                            ),
                          ),
                      );

                    return tx.select(cte[getViewName(activeView)]).from(cte);
                  }),
                ),
              ),
        );

        const findByOrigin = Effect.fn(
          "BillingAccounts.CustomerAuthorizationsRepository.findByOrigin",
        )(
          <TBillingAccountOrigin extends BillingAccount["origin"]>(
            origin: TBillingAccountOrigin,
            tenantId: BillingAccountCustomerAuthorization["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .select({ customerAuthorization: table })
                  .from(table)
                  .innerJoin(
                    billingAccountsTable,
                    and(
                      eq(billingAccountsTable.id, table.billingAccountId),
                      eq(billingAccountsTable.tenantId, table.tenantId),
                    ),
                  )
                  .where(
                    and(
                      eq(billingAccountsTable.origin, origin),
                      origin === "papercut"
                        ? not(eq(billingAccountsTable.papercutAccountId, -1))
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
          findActiveCreatesByCustomerId,
          findUpdates,
          findActiveUpdates,
          findActiveUpdatesByCustomerId,
          findDeletes,
          findActiveDeletes,
          findActiveDeletesByCustomerId,
          findFastForward,
          findActiveFastForward,
          findActiveFastForwardByCustomerId,
          findByOrigin,
        } as const;
      }),
    },
  ) {}

  export class ManagerAuthorizationsRepository extends Effect.Service<ManagerAuthorizationsRepository>()(
    "@printdesk/core/billing-accounts/ManagerAuthorizationsRepository",
    {
      dependencies: [
        Database.TransactionManager.Default,
        Replicache.ClientViewMetadataQueryBuilder.Default,
      ],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = billingAccountManagerAuthorizationsTable;
        const activeView = activeBillingAccountManagerAuthorizationsView;
        const activeCustomerAuthorizationsView =
          activeBillingAccountCustomerAuthorizationsView;

        const metadataQb = yield* Replicache.ClientViewMetadataQueryBuilder;
        const metadataTable = replicacheClientViewMetadataTable;

        const create = Effect.fn(
          "BillingAccounts.ManagerAuthorizationsRepository.create",
        )(
          (
            authorization: InferInsertModel<BillingAccountManagerAuthorizationsTable>,
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
          "BillingAccounts.ManagerAuthorizationsRepository.findCreates",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: BillingAccountManagerAuthorization["tenantId"],
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
          "BillingAccounts.ManagerAuthorizationsRepository.findActiveCreates",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: BillingAccountManagerAuthorization["tenantId"],
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

        const findActiveCreatesByCustomerId = Effect.fn(
          "BillingAccounts.ManagerAuthorizationsRepository.findActiveCreatesByCustomerId",
        )(
          (
            customerId: BillingAccountCustomerAuthorization["customerId"],
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: BillingAccountManagerAuthorization["tenantId"],
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
                      .$with(`${getViewName(activeView)}_creates_by_customer`)
                      .as(
                        tx
                          .select(getViewSelectedFields(activeView))
                          .from(activeView)
                          .innerJoin(
                            activeCustomerAuthorizationsView,
                            and(
                              eq(
                                activeView.billingAccountId,
                                activeCustomerAuthorizationsView.billingAccountId,
                              ),
                              eq(
                                activeView.tenantId,
                                activeCustomerAuthorizationsView.tenantId,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(
                                activeCustomerAuthorizationsView.customerId,
                                customerId,
                              ),
                              eq(activeView.tenantId, tenantId),
                            ),
                          ),
                      );

                    return tx
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
          "BillingAccounts.ManagerAuthorizationsRepository.findUpdates",
        )(
          (
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: BillingAccountManagerAuthorization["tenantId"],
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

                    return tx.select(cte[getTableName(table)]).from(cte);
                  }),
                ),
              ),
        );

        const findActiveUpdates = Effect.fn(
          "BillingAccounts.ManagerAuthorizationsRepository.findActiveUpdates",
        )(
          (
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: BillingAccountManagerAuthorization["tenantId"],
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

                    return tx.select(cte[getViewName(activeView)]).from(cte);
                  }),
                ),
              ),
        );

        const findActiveUpdatesByCustomerId = Effect.fn(
          "BillingAccounts.ManagerAuthorizationsRepository.findActiveUpdatesByCustomerId",
        )(
          (
            customerId: BillingAccountCustomerAuthorization["customerId"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: BillingAccountManagerAuthorization["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getViewName(activeView)}_updates_by_customer`)
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
                          .innerJoin(
                            activeCustomerAuthorizationsView,
                            and(
                              eq(
                                activeView.billingAccountId,
                                activeCustomerAuthorizationsView.billingAccountId,
                              ),
                              eq(
                                activeView.tenantId,
                                activeCustomerAuthorizationsView.tenantId,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(
                                activeCustomerAuthorizationsView.customerId,
                                customerId,
                              ),
                              eq(activeView.tenantId, tenantId),
                            ),
                          ),
                      );

                    return tx.select(cte[getViewName(activeView)]).from(cte);
                  }),
                ),
              ),
        );

        const findDeletes = Effect.fn(
          "BillingAccounts.ManagerAuthorizationsRepository.findDeletes",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: BillingAccountManagerAuthorization["tenantId"],
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
          "BillingAccounts.ManagerAuthorizationsRepository.findActiveDeletes",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: BillingAccountManagerAuthorization["tenantId"],
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

        const findActiveDeletesByCustomer = Effect.fn(
          "BillingAccounts.ManagerAuthorizationsRepository.findActiveDeletesByCustomer",
        )(
          (
            customerId: BillingAccountCustomerAuthorization["customerId"],
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: BillingAccountManagerAuthorization["tenantId"],
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
                        .innerJoin(
                          activeCustomerAuthorizationsView,
                          and(
                            eq(
                              activeView.id,
                              activeCustomerAuthorizationsView.billingAccountId,
                            ),
                            eq(
                              activeView.tenantId,
                              activeCustomerAuthorizationsView.tenantId,
                            ),
                          ),
                        )
                        .where(
                          and(
                            eq(
                              activeCustomerAuthorizationsView.customerId,
                              customerId,
                            ),
                            eq(activeView.tenantId, tenantId),
                          ),
                        ),
                    ),
                  ),
                ),
              ),
        );

        const findFastForward = Effect.fn(
          "BillingAccounts.ManagerAuthorizationsRepository.findFastForward",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: BillingAccountManagerAuthorization["tenantId"],
            excludeIds: Array<BillingAccountCustomerAuthorization["id"]>,
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

                    return tx.select(cte[getTableName(table)]).from(cte);
                  }),
                ),
              ),
        );

        const findActiveFastForward = Effect.fn(
          "BillingAccounts.ManagerAuthorizationsRepository.findActiveFastForward",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: BillingAccountManagerAuthorization["tenantId"],
            excludeIds: Array<BillingAccountCustomerAuthorization["id"]>,
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

                    return tx.select(cte[getViewName(activeView)]).from(cte);
                  }),
                ),
              ),
        );

        const findActiveFastForwardByCustomer = Effect.fn(
          "BillingAccounts.ManagerAuthorizationsRepository.findActiveFastForwardByCustomer",
        )(
          (
            customerId: BillingAccountCustomerAuthorization["customerId"],
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: BillingAccountManagerAuthorization["tenantId"],
            excludeIds: Array<BillingAccountCustomerAuthorization["id"]>,
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
                          .innerJoin(
                            activeCustomerAuthorizationsView,
                            and(
                              eq(
                                activeView.id,
                                activeCustomerAuthorizationsView.billingAccountId,
                              ),
                              eq(
                                activeView.tenantId,
                                activeCustomerAuthorizationsView.tenantId,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(
                                activeCustomerAuthorizationsView.customerId,
                                customerId,
                              ),
                              eq(activeView.tenantId, tenantId),
                            ),
                          ),
                      );

                    return tx.select(cte[getViewName(activeView)]).from(cte);
                  }),
                ),
              ),
        );

        const deleteById = Effect.fn(
          "BillingAccounts.ManagerAuthorizationsRepository.deleteById",
        )(
          (
            id: BillingAccountManagerAuthorization["id"],
            deletedAt: NonNullable<
              BillingAccountManagerAuthorization["deletedAt"]
            >,
            tenantId: BillingAccountManagerAuthorization["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .update(table)
                  .set({ deletedAt })
                  .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
                  .returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        return {
          create,
          findCreates,
          findActiveCreates,
          findActiveCreatesByCustomerId,
          findUpdates,
          findActiveUpdates,
          findActiveUpdatesByCustomerId,
          findDeletes,
          findActiveDeletes,
          findActiveDeletesByCustomer,
          findFastForward,
          findActiveFastForward,
          findActiveFastForwardByCustomer,
          deleteById,
        } as const;
      }),
    },
  ) {}

  export class ManagerAuthorizationMutations extends Effect.Service<ManagerAuthorizationMutations>()(
    "@printdesk/core/billing-accounts/ManagerAuthorizationMutations",
    {
      accessors: true,
      dependencies: [ManagerAuthorizationsRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* ManagerAuthorizationsRepository;

        const create = DataAccessContract.makeMutation(
          BillingAccountManagerAuthorizationsContract.create,
          Effect.succeed({
            makePolicy: () =>
              AccessControl.permission(
                "billing_account_manager_authorizations:create",
              ),
            mutator: (authorization, { tenantId }) =>
              repository.create({ ...authorization, tenantId }),
          }),
        );

        const delete_ = DataAccessContract.makeMutation(
          BillingAccountManagerAuthorizationsContract.delete_,
          Effect.succeed({
            makePolicy: () =>
              AccessControl.permission(
                "billing_account_manager_authorizations:delete",
              ),
            mutator: ({ id, deletedAt }, session) =>
              repository.deleteById(id, deletedAt, session.tenantId),
          }),
        );

        return { create, delete: delete_ } as const;
      }),
    },
  ) {}
}
