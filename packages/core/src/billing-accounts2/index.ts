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
import { Array, Effect, Equal, Struct } from "effect";

import { AccessControl } from "../access-control2";
import { DataAccessContract } from "../data-access2/contract";
import { Database } from "../database2";
import { buildConflictSet } from "../database2/constructors";
import { Replicache } from "../replicache2";
import { ReplicacheClientViewMetadataSchema } from "../replicache2/schemas";
import { UsersSchema } from "../users2/schema";
import {
  BillingAccountCustomerAuthorizationsContract,
  BillingAccountManagerAuthorizationsContract,
  BillingAccountsContract,
} from "./contracts";
import {
  BillingAccountCustomerAuthorizationsSchema,
  BillingAccountManagerAuthorizationsSchema,
  BillingAccountsSchema,
} from "./schemas";

import type { InferInsertModel } from "drizzle-orm";

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
        const table = BillingAccountsSchema.table;
        const activeView = BillingAccountsSchema.activeView;
        const activeManagerAuthorizedView =
          BillingAccountsSchema.activeManagerAuthorizedView;
        const activeCustomerAuthorizedView =
          BillingAccountsSchema.activeCustomerAuthorizedView;
        const activeCustomerAuthorizationsView =
          BillingAccountCustomerAuthorizationsSchema.activeView;
        const activeManagerAuthorizationsView =
          BillingAccountManagerAuthorizationsSchema.activeView;

        const metadataQb = yield* Replicache.ClientViewMetadataQueryBuilder;
        const metadataTable = ReplicacheClientViewMetadataSchema.table;

        const upsertMany = Effect.fn("BillingAccounts.Repository.upsertMany")(
          (values: Array<InferInsertModel<BillingAccountsSchema.Table>>) =>
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountsSchema.Row["tenantId"],
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountsSchema.Row["tenantId"],
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

        const findActiveCreatesByManagerId = Effect.fn(
          "BillingAccounts.Repository.findActiveCreatesByManagerId",
        )(
          (
            managerId: BillingAccountManagerAuthorizationsSchema.Row["managerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountsSchema.Row["tenantId"],
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
                              getViewSelectedFields(
                                activeManagerAuthorizedView,
                              ),
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
                                tenantId,
                              ),
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

        const findActiveCreatesByCustomerId = Effect.fn(
          "BillingAccounts.Repository.findActiveCreatesByCustomerId",
        )(
          (
            customerId: BillingAccountCustomerAuthorizationsSchema.Row["customerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountsSchema.Row["tenantId"],
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
                              getViewSelectedFields(
                                activeCustomerAuthorizedView,
                              ),
                              "authorizedCustomerId",
                            ),
                          )
                          .from(activeCustomerAuthorizedView)
                          .where(
                            and(
                              eq(
                                activeCustomerAuthorizationsView.customerId,
                                customerId,
                              ),
                              eq(
                                activeCustomerAuthorizationsView.tenantId,
                                tenantId,
                              ),
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
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountsSchema.Row["tenantId"],
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
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountsSchema.Row["tenantId"],
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

        const findActiveUpdatesByManagerId = Effect.fn(
          "BillingAccounts.Repository.findActiveUpdatesByManagerId",
        )(
          (
            managerId: BillingAccountManagerAuthorizationsSchema.Row["managerId"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountsSchema.Row["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
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
                                metadataTable.entityId,
                                activeManagerAuthorizedView.id,
                              ),
                              not(
                                eq(
                                  metadataTable.entityVersion,
                                  activeManagerAuthorizedView.version,
                                ),
                              ),
                              eq(
                                metadataTable.tenantId,
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
                                tenantId,
                              ),
                            ),
                          ),
                      );

                    return tx
                      .selectDistinctOn(
                        [
                          activeManagerAuthorizedView.id,
                          activeManagerAuthorizedView.tenantId,
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

        const findActiveUpdatesByCustomerId = Effect.fn(
          "BillingAccounts.Repository.findActiveUpdatesByCustomerId",
        )(
          (
            customerId: BillingAccountCustomerAuthorizationsSchema.Row["customerId"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountsSchema.Row["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
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
                                metadataTable.entityId,
                                activeCustomerAuthorizedView.id,
                              ),
                              not(
                                eq(
                                  metadataTable.entityVersion,
                                  activeCustomerAuthorizedView.version,
                                ),
                              ),
                              eq(
                                metadataTable.tenantId,
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
                                tenantId,
                              ),
                            ),
                          ),
                      );

                    return tx
                      .selectDistinctOn(
                        [
                          activeCustomerAuthorizedView.id,
                          activeCustomerAuthorizedView.tenantId,
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

        const findDeletes = Effect.fn("BillingAccounts.Repository.findDeletes")(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountsSchema.Row["tenantId"],
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountsSchema.Row["tenantId"],
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

        const findActiveDeletesByManagerId = Effect.fn(
          "BillingAccounts.Repository.findActiveDeletesByManagerId",
        )(
          (
            managerId: BillingAccountManagerAuthorizationsSchema.Row["managerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountsSchema.Row["tenantId"],
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
                            eq(activeManagerAuthorizedView.tenantId, tenantId),
                          ),
                        ),
                    ),
                  ),
                ),
              ),
        );

        const findActiveDeletesByCustomerId = Effect.fn(
          "BillingAccounts.Repository.findActiveDeletesByCustomerId",
        )(
          (
            customerId: BillingAccountCustomerAuthorizationsSchema.Row["customerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountsSchema.Row["tenantId"],
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
                            eq(activeCustomerAuthorizedView.tenantId, tenantId),
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountsSchema.Row["tenantId"],
            excludeIds: Array<BillingAccountsSchema.Row["id"]>,
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountsSchema.Row["tenantId"],
            excludeIds: Array<BillingAccountsSchema.Row["id"]>,
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

        const findActiveFastForwardByManagerId = Effect.fn(
          "BillingAccounts.Repository.findActiveFastForwardByManagerId",
        )(
          (
            managerId: BillingAccountManagerAuthorizationsSchema.Row["managerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountsSchema.Row["tenantId"],
            excludeIds: Array<BillingAccountsSchema.Row["id"]>,
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
                      .$with(
                        `${getViewName(activeManagerAuthorizedView)}_fast_forward`,
                      )
                      .as(
                        qb
                          .innerJoin(
                            activeManagerAuthorizedView,
                            and(
                              eq(
                                metadataTable.entity,
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
                                tenantId,
                              ),
                            ),
                          ),
                      );

                    return tx
                      .selectDistinctOn(
                        [
                          activeManagerAuthorizedView.id,
                          activeManagerAuthorizedView.tenantId,
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

        const findActiveFastForwardByCustomerId = Effect.fn(
          "BillingAccounts.Repository.findActiveFastForwardByCustomerId",
        )(
          (
            customerId: BillingAccountCustomerAuthorizationsSchema.Row["customerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountsSchema.Row["tenantId"],
            excludeIds: Array<BillingAccountsSchema.Row["id"]>,
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
                      .$with(
                        `${getViewName(activeCustomerAuthorizedView)}_fast_forward`,
                      )
                      .as(
                        qb
                          .innerJoin(
                            activeCustomerAuthorizedView,
                            and(
                              eq(
                                metadataTable.entity,
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
                                tenantId,
                              ),
                            ),
                          ),
                      );

                    return tx
                      .selectDistinctOn(
                        [
                          activeCustomerAuthorizedView.id,
                          activeCustomerAuthorizedView.tenantId,
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

        const findByOrigin = Effect.fn(
          "BillingAccounts.Repository.findByOrigin",
        )(
          <TBillingAccountOrigin extends BillingAccountsSchema.Row["origin"]>(
            origin: TBillingAccountOrigin,
            tenantId: BillingAccountsSchema.Row["tenantId"],
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
          "BillingAccounts.Repository.findActiveAuthorizedCustomerIds",
        )(
          (
            id: BillingAccountsSchema.Row["id"],
            tenantId: BillingAccountsSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .select({ id: UsersSchema.activeView.id })
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
                    UsersSchema.activeView,
                    and(
                      eq(
                        activeCustomerAuthorizationsView.customerId,
                        UsersSchema.activeView.id,
                      ),
                      eq(
                        activeCustomerAuthorizationsView.tenantId,
                        UsersSchema.activeView.tenantId,
                      ),
                    ),
                  )
                  .where(
                    and(
                      eq(activeView.id, id),
                      eq(activeView.tenantId, tenantId),
                    ),
                  ),
              )
              .pipe(Effect.map(Array.map(({ id }) => id))),
        );

        const findActiveAuthorizedManagerIds = Effect.fn(
          "BillingAccounts.Repository.findActiveAuthorizedManagerIds",
        )(
          (
            id: BillingAccountsSchema.Row["id"],
            tenantId: BillingAccountsSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .select({ id: UsersSchema.activeView.id })
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
                    UsersSchema.activeView,
                    and(
                      eq(
                        activeManagerAuthorizationsView.managerId,
                        UsersSchema.activeView.id,
                      ),
                      eq(
                        activeManagerAuthorizationsView.tenantId,
                        UsersSchema.activeView.tenantId,
                      ),
                    ),
                  )
                  .where(
                    and(
                      eq(activeView.id, id),
                      eq(activeView.tenantId, tenantId),
                    ),
                  ),
              )
              .pipe(Effect.map(Array.map(({ id }) => id))),
        );

        const findActiveAuthorizedUserIds = Effect.fn(
          "BillingAccounts.Repository.findActiveAuthorizedUserIds",
        )(
          (
            id: BillingAccountsSchema.Row["id"],
            tenantId: BillingAccountsSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .select({ id: UsersSchema.activeView.id })
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
                    UsersSchema.activeView,
                    or(
                      and(
                        eq(
                          activeCustomerAuthorizationsView.customerId,
                          UsersSchema.activeView.id,
                        ),
                        eq(
                          activeCustomerAuthorizationsView.tenantId,
                          UsersSchema.activeView.tenantId,
                        ),
                      ),
                      and(
                        eq(
                          activeManagerAuthorizationsView.managerId,
                          UsersSchema.activeView.id,
                        ),
                        eq(
                          activeManagerAuthorizationsView.tenantId,
                          UsersSchema.activeView.tenantId,
                        ),
                      ),
                    ),
                  )
                  .where(
                    and(
                      eq(activeView.id, id),
                      eq(activeView.tenantId, tenantId),
                    ),
                  ),
              )
              .pipe(Effect.map(Array.map(({ id }) => id))),
        );

        const updateById = Effect.fn("BillingAccounts.Repository.updateById")(
          (
            id: BillingAccountsSchema.Row["id"],
            billingAccount: Partial<
              Omit<BillingAccountsSchema.Row, "id" | "tenantId">
            >,
            tenantId: BillingAccountsSchema.Row["tenantId"],
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
            id: BillingAccountsSchema.Row["id"],
            deletedAt: NonNullable<BillingAccountsSchema.Row["deletedAt"]>,
            tenantId: BillingAccountsSchema.Row["tenantId"],
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
          findActiveCreatesByManagerId,
          findActiveCreatesByCustomerId,
          findUpdates,
          findActiveUpdates,
          findActiveUpdatesByManagerId,
          findActiveUpdatesByCustomerId,
          findDeletes,
          findActiveDeletes,
          findActiveDeletesByManagerId,
          findActiveDeletesByCustomerId,
          findFastForward,
          findActiveFastForward,
          findActiveFastForwardByManagerId,
          findActiveFastForwardByCustomerId,
          findByOrigin,
          findActiveAuthorizedCustomerIds,
          findActiveAuthorizedManagerIds,
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

        const hasActiveCustomerAuthorization = DataAccessContract.makePolicy(
          BillingAccountsContract.hasActiveCustomerAuthorization,
          Effect.succeed({
            make: ({ id, customerId }) =>
              AccessControl.policy((principal) =>
                repository
                  .findActiveAuthorizedCustomerIds(id, principal.tenantId)
                  .pipe(
                    Effect.map(
                      Array.some(Equal.equals(customerId ?? principal.userId)),
                    ),
                  ),
              ),
          }),
        );

        const hasActiveManagerAuthorization = DataAccessContract.makePolicy(
          BillingAccountsContract.hasActiveManagerAuthorization,
          Effect.succeed({
            make: ({ id }) =>
              AccessControl.policy((principal) =>
                repository
                  .findActiveAuthorizedManagerIds(id, principal.tenantId)
                  .pipe(Effect.map(Array.some(Equal.equals(principal.userId)))),
              ),
          }),
        );

        const hasActiveAuthorization = DataAccessContract.makePolicy(
          BillingAccountsContract.hasActiveAuthorization,
          Effect.succeed({
            make: ({ id }) =>
              AccessControl.policy((principal) =>
                repository
                  .findActiveAuthorizedUserIds(id, principal.tenantId)
                  .pipe(Effect.map(Array.some(Equal.equals(principal.userId)))),
              ),
          }),
        );

        return {
          hasActiveCustomerAuthorization,
          hasActiveManagerAuthorization,
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
              repository
                .updateById(id, billingAccount, session.tenantId)
                .pipe(Effect.map(Struct.omit("version"))),
          }),
        );

        const delete_ = DataAccessContract.makeMutation(
          BillingAccountsContract.delete_,
          Effect.succeed({
            makePolicy: () =>
              AccessControl.permission("billing_accounts:delete"),
            mutator: ({ id, deletedAt }, session) =>
              repository
                .deleteById(id, deletedAt, session.tenantId)
                .pipe(Effect.map(Struct.omit("version"))),
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
        const table = BillingAccountCustomerAuthorizationsSchema.table;
        const activeView =
          BillingAccountCustomerAuthorizationsSchema.activeView;

        const metadataQb = yield* Replicache.ClientViewMetadataQueryBuilder;
        const metadataTable = ReplicacheClientViewMetadataSchema.table;

        const upsertMany = Effect.fn(
          "BillingAccounts.CustomerAuthorizationsRepository.upsertMany",
        )(
          (
            values: Array<
              InferInsertModel<BillingAccountCustomerAuthorizationsSchema.Table>
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountCustomerAuthorizationsSchema.Row["tenantId"],
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountCustomerAuthorizationsSchema.Row["tenantId"],
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
            customerId: BillingAccountCustomerAuthorizationsSchema.Row["customerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountCustomerAuthorizationsSchema.Row["tenantId"],
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
                      .$with(
                        `${BillingAccountCustomerAuthorizationsContract.activeAuthorizedViewName}_creates`,
                      )
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
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountCustomerAuthorizationsSchema.Row["tenantId"],
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
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountCustomerAuthorizationsSchema.Row["tenantId"],
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
            customerId: BillingAccountCustomerAuthorizationsSchema.Row["customerId"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountCustomerAuthorizationsSchema.Row["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(
                        `${BillingAccountCustomerAuthorizationsContract.activeAuthorizedViewName}_updates`,
                      )
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountCustomerAuthorizationsSchema.Row["tenantId"],
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountCustomerAuthorizationsSchema.Row["tenantId"],
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
            customerId: BillingAccountCustomerAuthorizationsSchema.Row["customerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountCustomerAuthorizationsSchema.Row["tenantId"],
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountCustomerAuthorizationsSchema.Row["tenantId"],
            excludeIds: Array<
              BillingAccountCustomerAuthorizationsSchema.Row["id"]
            >,
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountCustomerAuthorizationsSchema.Row["tenantId"],
            excludeIds: Array<
              BillingAccountCustomerAuthorizationsSchema.Row["id"]
            >,
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
            customerId: BillingAccountCustomerAuthorizationsSchema.Row["customerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountCustomerAuthorizationsSchema.Row["tenantId"],
            excludeIds: Array<
              BillingAccountCustomerAuthorizationsSchema.Row["id"]
            >,
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
                      .$with(
                        `${BillingAccountCustomerAuthorizationsContract.activeAuthorizedViewName}_fast_forward`,
                      )
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
          <TBillingAccountOrigin extends BillingAccountsSchema.Row["origin"]>(
            origin: TBillingAccountOrigin,
            tenantId: BillingAccountCustomerAuthorizationsSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .select({ customerAuthorization: table })
                  .from(table)
                  .innerJoin(
                    BillingAccountsSchema.table,
                    and(
                      eq(
                        BillingAccountsSchema.table.id,
                        table.billingAccountId,
                      ),
                      eq(BillingAccountsSchema.table.tenantId, table.tenantId),
                    ),
                  )
                  .where(
                    and(
                      eq(BillingAccountsSchema.table.origin, origin),
                      origin === "papercut"
                        ? not(
                            eq(
                              BillingAccountsSchema.table.papercutAccountId,
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
        const table = BillingAccountManagerAuthorizationsSchema.table;
        const activeView = BillingAccountManagerAuthorizationsSchema.activeView;
        const activeCustomerAuthorizedView =
          BillingAccountManagerAuthorizationsSchema.activeCustomerAuthorizedView;

        const metadataQb = yield* Replicache.ClientViewMetadataQueryBuilder;
        const metadataTable = ReplicacheClientViewMetadataSchema.table;

        const create = Effect.fn(
          "BillingAccounts.ManagerAuthorizationsRepository.create",
        )(
          (
            authorization: InferInsertModel<BillingAccountManagerAuthorizationsSchema.Table>,
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountManagerAuthorizationsSchema.Row["tenantId"],
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountManagerAuthorizationsSchema.Row["tenantId"],
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

        const findActiveCreatesByManagerId = Effect.fn(
          "BillingAccounts.ManagerAuthorizationsRepository.findActiveCreatesByManagerId",
        )(
          (
            managerId: BillingAccountManagerAuthorizationsSchema.Row["managerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountManagerAuthorizationsSchema.Row["tenantId"],
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
                      .$with(
                        `${BillingAccountManagerAuthorizationsContract.activeAuthorizedViewName}_creates`,
                      )
                      .as(
                        tx
                          .select(getViewSelectedFields(activeView))
                          .from(activeView)
                          .where(
                            and(
                              eq(activeView.managerId, managerId),
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

        const findActiveCreatesByCustomerId = Effect.fn(
          "BillingAccounts.ManagerAuthorizationsRepository.findActiveCreatesByCustomerId",
        )(
          (
            customerId: BillingAccountCustomerAuthorizationsSchema.Row["customerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountManagerAuthorizationsSchema.Row["tenantId"],
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
                              getViewSelectedFields(
                                activeCustomerAuthorizedView,
                              ),
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
                                tenantId,
                              ),
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
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountManagerAuthorizationsSchema.Row["tenantId"],
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
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountManagerAuthorizationsSchema.Row["tenantId"],
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

        const findActiveUpdatesByManagerId = Effect.fn(
          "BillingAccounts.ManagerAuthorizationsRepository.findActiveUpdatesByManagerId",
        )(
          (
            managerId: BillingAccountManagerAuthorizationsSchema.Row["managerId"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountManagerAuthorizationsSchema.Row["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(
                        `${BillingAccountManagerAuthorizationsContract.activeAuthorizedViewName}_updates`,
                      )
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
                              eq(activeView.managerId, managerId),
                              eq(activeView.tenantId, tenantId),
                            ),
                          ),
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
            customerId: BillingAccountCustomerAuthorizationsSchema.Row["customerId"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountManagerAuthorizationsSchema.Row["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
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
                                metadataTable.entityId,
                                activeCustomerAuthorizedView.id,
                              ),
                              not(
                                eq(
                                  metadataTable.entityVersion,
                                  activeCustomerAuthorizedView.version,
                                ),
                              ),
                              eq(
                                metadataTable.tenantId,
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
                                tenantId,
                              ),
                            ),
                          ),
                      );

                    return tx
                      .selectDistinctOn(
                        [
                          activeCustomerAuthorizedView.id,
                          activeCustomerAuthorizedView.tenantId,
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
          "BillingAccounts.ManagerAuthorizationsRepository.findDeletes",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountManagerAuthorizationsSchema.Row["tenantId"],
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountManagerAuthorizationsSchema.Row["tenantId"],
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

        const findActiveDeletesByManagerId = Effect.fn(
          "BillingAccounts.ManagerAuthorizationsRepository.findActiveDeletesByManagerId",
        )(
          (
            managerId: BillingAccountManagerAuthorizationsSchema.Row["managerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountManagerAuthorizationsSchema.Row["tenantId"],
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
                            eq(activeView.managerId, managerId),
                            eq(activeView.tenantId, tenantId),
                          ),
                        ),
                    ),
                  ),
                ),
              ),
        );

        const findActiveDeletesByCustomerId = Effect.fn(
          "BillingAccounts.ManagerAuthorizationsRepository.findActiveDeletesByCustomerId",
        )(
          (
            customerId: BillingAccountCustomerAuthorizationsSchema.Row["customerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountManagerAuthorizationsSchema.Row["tenantId"],
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
                            eq(activeCustomerAuthorizedView.tenantId, tenantId),
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountManagerAuthorizationsSchema.Row["tenantId"],
            excludeIds: Array<
              BillingAccountManagerAuthorizationsSchema.Row["id"]
            >,
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountManagerAuthorizationsSchema.Row["tenantId"],
            excludeIds: Array<
              BillingAccountManagerAuthorizationsSchema.Row["id"]
            >,
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

        const findActiveFastForwardByManagerId = Effect.fn(
          "BillingAccounts.ManagerAuthorizationsRepository.findActiveFastForwardByManagerId",
        )(
          (
            managerId: BillingAccountManagerAuthorizationsSchema.Row["managerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountManagerAuthorizationsSchema.Row["tenantId"],
            excludeIds: Array<
              BillingAccountManagerAuthorizationsSchema.Row["id"]
            >,
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
                      .$with(
                        `${BillingAccountManagerAuthorizationsContract.activeAuthorizedViewName}_fast_forward`,
                      )
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
                              eq(activeView.managerId, managerId),
                              eq(activeView.tenantId, tenantId),
                            ),
                          ),
                      );

                    return tx.select(cte[getViewName(activeView)]).from(cte);
                  }),
                ),
              ),
        );

        const findActiveFastForwardByCustomerId = Effect.fn(
          "BillingAccounts.ManagerAuthorizationsRepository.findActiveFastForwardByCustomerId",
        )(
          (
            customerId: BillingAccountCustomerAuthorizationsSchema.Row["customerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountManagerAuthorizationsSchema.Row["tenantId"],
            excludeIds: Array<
              BillingAccountManagerAuthorizationsSchema.Row["id"]
            >,
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
                      .$with(
                        `${getViewName(activeCustomerAuthorizedView)}_fast_forward`,
                      )
                      .as(
                        qb
                          .innerJoin(
                            activeCustomerAuthorizedView,
                            and(
                              eq(
                                metadataTable.entityId,
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
                                tenantId,
                              ),
                            ),
                          ),
                      );

                    return tx
                      .selectDistinctOn(
                        [
                          activeCustomerAuthorizedView.id,
                          activeCustomerAuthorizedView.tenantId,
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

        const deleteById = Effect.fn(
          "BillingAccounts.ManagerAuthorizationsRepository.deleteById",
        )(
          (
            id: BillingAccountManagerAuthorizationsSchema.Row["id"],
            deletedAt: NonNullable<
              BillingAccountManagerAuthorizationsSchema.Row["deletedAt"]
            >,
            tenantId: BillingAccountManagerAuthorizationsSchema.Row["tenantId"],
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
          findActiveCreatesByManagerId,
          findActiveCreatesByCustomerId,
          findUpdates,
          findActiveUpdates,
          findActiveUpdatesByManagerId,
          findActiveUpdatesByCustomerId,
          findDeletes,
          findActiveDeletes,
          findActiveDeletesByManagerId,
          findActiveDeletesByCustomerId,
          findFastForward,
          findActiveFastForward,
          findActiveFastForwardByManagerId,
          findActiveFastForwardByCustomerId,
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
              repository
                .create({ ...authorization, tenantId })
                .pipe(Effect.map(Struct.omit("version"))),
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
              repository
                .deleteById(id, deletedAt, session.tenantId)
                .pipe(Effect.map(Struct.omit("version"))),
          }),
        );

        return { create, delete: delete_ } as const;
      }),
    },
  ) {}
}
