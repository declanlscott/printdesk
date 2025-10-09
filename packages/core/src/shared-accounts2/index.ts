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
import { Replicache } from "../replicache2";
import { ReplicacheNotifier } from "../replicache2/notifier";
import { ReplicacheClientViewMetadataSchema } from "../replicache2/schemas";
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

export namespace SharedAccounts {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/shared-accounts/Repository",
    {
      dependencies: [
        Database.TransactionManager.Default,
        Replicache.ClientViewMetadataQueryBuilder.Default,
      ],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = SharedAccountsSchema.table.definition;
        const activeView = SharedAccountsSchema.activeView;
        const activeManagerAuthorizedView =
          SharedAccountsSchema.activeManagerAuthorizedView;
        const activeCustomerAuthorizedView =
          SharedAccountsSchema.activeCustomerAuthorizedView;

        const metadataQb = yield* Replicache.ClientViewMetadataQueryBuilder;
        const metadataTable =
          ReplicacheClientViewMetadataSchema.table.definition;

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
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountsSchema.Row["tenantId"],
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
          "SharedAccounts.Repository.findActiveCreates",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountsSchema.ActiveRow["tenantId"],
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

        const findActiveCustomerAuthorizedCreates = Effect.fn(
          "SharedAccounts.Repository.findActiveCustomerAuthorizedCreates",
        )(
          (
            customerId: SharedAccountsSchema.ActiveCustomerAuthorizedRow["authorizedCustomerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountsSchema.ActiveCustomerAuthorizedRow["tenantId"],
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
            managerId: SharedAccountsSchema.ActiveManagerAuthorizedRow["authorizedManagerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountsSchema.ActiveManagerAuthorizedRow["tenantId"],
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
          (
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountsSchema.Row["tenantId"],
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
          "SharedAccounts.Repository.findActiveUpdates",
        )(
          (
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountsSchema.ActiveRow["tenantId"],
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

        const findActiveCustomerAuthorizedUpdates = Effect.fn(
          "SharedAccounts.Repository.findActiveCustomerAuthorizedUpdates",
        )(
          (
            customerId: SharedAccountsSchema.ActiveCustomerAuthorizedRow["authorizedCustomerId"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountsSchema.ActiveCustomerAuthorizedRow["tenantId"],
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

        const findActiveManagerAuthorizedUpdates = Effect.fn(
          "SharedAccounts.Repository.findActiveManagerAuthorizedUpdates",
        )(
          (
            managerId: SharedAccountsSchema.ActiveManagerAuthorizedRow["authorizedManagerId"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountsSchema.ActiveManagerAuthorizedRow["tenantId"],
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

        const findDeletes = Effect.fn("SharedAccounts.Repository.findDeletes")(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountsSchema.Row["tenantId"],
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
          "SharedAccounts.Repository.findActiveDeletes",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountsSchema.ActiveRow["tenantId"],
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

        const findActiveCustomerAuthorizedDeletes = Effect.fn(
          "SharedAccounts.Repository.findActiveCustomerAuthorizedDeletes",
        )(
          (
            customerId: SharedAccountsSchema.ActiveCustomerAuthorizedRow["authorizedCustomerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountsSchema.ActiveCustomerAuthorizedRow["tenantId"],
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

        const findActiveManagerAuthorizedDeletes = Effect.fn(
          "SharedAccounts.Repository.findActiveManagerAuthorizedDeletes",
        )(
          (
            managerId: SharedAccountsSchema.ActiveManagerAuthorizedRow["authorizedManagerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountsSchema.ActiveManagerAuthorizedRow["tenantId"],
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

        const findFastForward = Effect.fn(
          "SharedAccounts.Repository.findFastForward",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountsSchema.Row["tenantId"],
            excludeIds: Array<SharedAccountsSchema.Row["id"]>,
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountsSchema.ActiveRow["tenantId"],
            excludeIds: Array<SharedAccountsSchema.ActiveRow["id"]>,
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
            customerId: SharedAccountsSchema.ActiveCustomerAuthorizedRow["authorizedCustomerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountsSchema.ActiveCustomerAuthorizedRow["tenantId"],
            excludeIds: Array<
              SharedAccountsSchema.ActiveCustomerAuthorizedRow["id"]
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
            managerId: SharedAccountsSchema.ActiveManagerAuthorizedRow["authorizedManagerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountsSchema.ActiveManagerAuthorizedRow["tenantId"],
            excludeIds: Array<
              SharedAccountsSchema.ActiveManagerAuthorizedRow["id"]
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
                  .pipe(
                    Effect.map(Struct.omit("version")),
                    Effect.tap(notifyEdit),
                  ),
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
                  .pipe(
                    Effect.map(Struct.omit("version")),
                    Effect.tap(notifyDelete),
                  ),
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
                  .pipe(
                    Effect.map(Struct.omit("version")),
                    Effect.tap(notifyRestore),
                  ),
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
        Replicache.ClientViewMetadataQueryBuilder.Default,
      ],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table =
          SharedAccountCustomerAuthorizationsSchema.table.definition;
        const activeView = SharedAccountCustomerAuthorizationsSchema.activeView;
        const activeAuthorizedView =
          SharedAccountCustomerAuthorizationsSchema.activeAuthorizedView;

        const metadataQb = yield* Replicache.ClientViewMetadataQueryBuilder;
        const metadataTable =
          ReplicacheClientViewMetadataSchema.table.definition;

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
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountCustomerAuthorizationsSchema.Row["tenantId"],
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
          "SharedAccounts.CustomerAuthorizationsRepository.findActiveCreates",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountCustomerAuthorizationsSchema.ActiveRow["tenantId"],
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

        const findActiveAuthorizedCreates = Effect.fn(
          "SharedAccounts.CustomerAuthorizationsRepository.findActiveAuthorizedCreates",
        )(
          (
            customerId: SharedAccountCustomerAuthorizationsSchema.ActiveAuthorizedRow["customerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountCustomerAuthorizationsSchema.ActiveAuthorizedRow["tenantId"],
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
                        `${SharedAccountCustomerAuthorizationsContract.activeAuthorizedViewName}_creates`,
                      )
                      .as(
                        tx
                          .select()
                          .from(activeAuthorizedView)
                          .where(
                            and(
                              eq(activeAuthorizedView.customerId, customerId),
                              eq(activeAuthorizedView.tenantId, tenantId),
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
        )(
          (
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountCustomerAuthorizationsSchema.Row["tenantId"],
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

                    return tx
                      .with(cte)
                      .select(cte[getTableName(table)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActiveUpdates = Effect.fn(
          "SharedAccounts.CustomerAuthorizationsRepository.findActiveUpdates",
        )(
          (
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountCustomerAuthorizationsSchema.ActiveRow["tenantId"],
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

        const findActiveAuthorizedUpdates = Effect.fn(
          "SharedAccounts.CustomerAuthorizationsRepository.findActiveAuthorizedUpdates",
        )(
          (
            customerId: SharedAccountCustomerAuthorizationsSchema.ActiveAuthorizedRow["customerId"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountCustomerAuthorizationsSchema.ActiveAuthorizedRow["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
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
                              eq(
                                metadataTable.entityId,
                                activeAuthorizedView.id,
                              ),
                              not(
                                eq(
                                  metadataTable.entityVersion,
                                  activeAuthorizedView.version,
                                ),
                              ),
                              eq(
                                metadataTable.tenantId,
                                activeAuthorizedView.tenantId,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(activeAuthorizedView.customerId, customerId),
                              eq(activeAuthorizedView.tenantId, tenantId),
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
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountCustomerAuthorizationsSchema.Row["tenantId"],
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
          "SharedAccounts.CustomerAuthorizationsRepository.findActiveDeletes",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountCustomerAuthorizationsSchema.ActiveRow["tenantId"],
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

        const findActiveAuthorizedDeletes = Effect.fn(
          "SharedAccounts.Repository.findActiveAuthorizedDeletes",
        )(
          (
            customerId: SharedAccountCustomerAuthorizationsSchema.ActiveAuthorizedRow["customerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountCustomerAuthorizationsSchema.ActiveAuthorizedRow["tenantId"],
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
                        .select({ id: activeAuthorizedView.id })
                        .from(activeAuthorizedView)
                        .where(
                          and(
                            eq(activeAuthorizedView.customerId, customerId),
                            eq(activeAuthorizedView.tenantId, tenantId),
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountCustomerAuthorizationsSchema.Row["tenantId"],
            excludeIds: Array<
              SharedAccountCustomerAuthorizationsSchema.Row["id"]
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountCustomerAuthorizationsSchema.ActiveRow["tenantId"],
            excludeIds: Array<
              SharedAccountCustomerAuthorizationsSchema.ActiveRow["id"]
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
            customerId: SharedAccountCustomerAuthorizationsSchema.ActiveAuthorizedRow["customerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountCustomerAuthorizationsSchema.ActiveAuthorizedRow["tenantId"],
            excludeIds: Array<
              SharedAccountCustomerAuthorizationsSchema.ActiveAuthorizedRow["id"]
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
                        `${SharedAccountCustomerAuthorizationsContract.activeAuthorizedViewName}_fast_forward`,
                      )
                      .as(
                        qb
                          .innerJoin(
                            activeAuthorizedView,
                            and(
                              eq(
                                metadataTable.entityId,
                                activeAuthorizedView.id,
                              ),
                              notInArray(activeAuthorizedView.id, excludeIds),
                            ),
                          )
                          .where(
                            and(
                              eq(activeAuthorizedView.customerId, customerId),
                              eq(activeAuthorizedView.tenantId, tenantId),
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
          findActiveCreatesByCustomerId: findActiveAuthorizedCreates,
          findUpdates,
          findActiveUpdates,
          findActiveUpdatesByCustomerId: findActiveAuthorizedUpdates,
          findDeletes,
          findActiveDeletes,
          findActiveDeletesByCustomerId: findActiveAuthorizedDeletes,
          findFastForward,
          findActiveFastForward,
          findActiveFastForwardByCustomerId: findActiveAuthorizedFastForward,
          findByOrigin,
        } as const;
      }),
    },
  ) {}

  export class ManagerAuthorizationsRepository extends Effect.Service<ManagerAuthorizationsRepository>()(
    "@printdesk/core/shared-accounts/ManagerAuthorizationsRepository",
    {
      dependencies: [
        Database.TransactionManager.Default,
        Replicache.ClientViewMetadataQueryBuilder.Default,
      ],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = SharedAccountManagerAuthorizationsSchema.table.definition;
        const activeView = SharedAccountManagerAuthorizationsSchema.activeView;
        const activeCustomerAuthorizedView =
          SharedAccountManagerAuthorizationsSchema.activeCustomerAuthorizedView;

        const metadataQb = yield* Replicache.ClientViewMetadataQueryBuilder;
        const metadataTable =
          ReplicacheClientViewMetadataSchema.table.definition;

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
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountManagerAuthorizationsSchema.Row["tenantId"],
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
          "SharedAccounts.ManagerAuthorizationsRepository.findActiveCreates",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountManagerAuthorizationsSchema.Row["tenantId"],
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

        const findActiveCreatesByManagerId = Effect.fn(
          "SharedAccounts.ManagerAuthorizationsRepository.findActiveCreatesByManagerId",
        )(
          (
            managerId: SharedAccountManagerAuthorizationsSchema.Row["managerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountManagerAuthorizationsSchema.Row["tenantId"],
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
                        `${SharedAccountManagerAuthorizationsContract.activeAuthorizedViewName}_creates`,
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

        const findActiveCreatesByCustomerId = Effect.fn(
          "SharedAccounts.ManagerAuthorizationsRepository.findActiveCreatesByCustomerId",
        )(
          (
            customerId: SharedAccountCustomerAuthorizationsSchema.Row["customerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountManagerAuthorizationsSchema.Row["tenantId"],
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
        )(
          (
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountManagerAuthorizationsSchema.Row["tenantId"],
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
          "SharedAccounts.ManagerAuthorizationsRepository.findActiveUpdates",
        )(
          (
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountManagerAuthorizationsSchema.Row["tenantId"],
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

        const findActiveUpdatesByManagerId = Effect.fn(
          "SharedAccounts.ManagerAuthorizationsRepository.findActiveUpdatesByManagerId",
        )(
          (
            managerId: SharedAccountManagerAuthorizationsSchema.Row["managerId"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountManagerAuthorizationsSchema.Row["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
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

                    return tx
                      .with(cte)
                      .select(cte[getViewName(activeView)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActiveUpdatesByCustomerId = Effect.fn(
          "SharedAccounts.ManagerAuthorizationsRepository.findActiveUpdatesByCustomerId",
        )(
          (
            customerId: SharedAccountCustomerAuthorizationsSchema.Row["customerId"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountManagerAuthorizationsSchema.Row["tenantId"],
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

        const findDeletes = Effect.fn(
          "SharedAccounts.ManagerAuthorizationsRepository.findDeletes",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountManagerAuthorizationsSchema.Row["tenantId"],
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
          "SharedAccounts.ManagerAuthorizationsRepository.findActiveDeletes",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountManagerAuthorizationsSchema.Row["tenantId"],
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
          "SharedAccounts.ManagerAuthorizationsRepository.findActiveDeletesByManagerId",
        )(
          (
            managerId: SharedAccountManagerAuthorizationsSchema.Row["managerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountManagerAuthorizationsSchema.Row["tenantId"],
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
          "SharedAccounts.ManagerAuthorizationsRepository.findActiveDeletesByCustomerId",
        )(
          (
            customerId: SharedAccountCustomerAuthorizationsSchema.Row["customerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountManagerAuthorizationsSchema.Row["tenantId"],
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
          "SharedAccounts.ManagerAuthorizationsRepository.findFastForward",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountManagerAuthorizationsSchema.Row["tenantId"],
            excludeIds: Array<
              SharedAccountManagerAuthorizationsSchema.Row["id"]
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountManagerAuthorizationsSchema.Row["tenantId"],
            excludeIds: Array<
              SharedAccountManagerAuthorizationsSchema.Row["id"]
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

                    return tx
                      .with(cte)
                      .select(cte[getViewName(activeView)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActiveFastForwardByManagerId = Effect.fn(
          "SharedAccounts.ManagerAuthorizationsRepository.findActiveFastForwardByManagerId",
        )(
          (
            managerId: SharedAccountManagerAuthorizationsSchema.Row["managerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountManagerAuthorizationsSchema.Row["tenantId"],
            excludeIds: Array<
              SharedAccountManagerAuthorizationsSchema.Row["id"]
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
                        `${SharedAccountManagerAuthorizationsContract.activeAuthorizedViewName}_fast_forward`,
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

                    return tx
                      .with(cte)
                      .select(cte[getViewName(activeView)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActiveFastForwardByCustomerId = Effect.fn(
          "SharedAccounts.ManagerAuthorizationsRepository.findActiveFastForwardByCustomerId",
        )(
          (
            customerId: SharedAccountCustomerAuthorizationsSchema.Row["customerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountManagerAuthorizationsSchema.Row["tenantId"],
            excludeIds: Array<
              SharedAccountManagerAuthorizationsSchema.Row["id"]
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
          findById,
          updateById,
        } as const;
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
                .pipe(
                  Effect.map(Struct.omit("version")),
                  Effect.tap(notifyCreate),
                ),
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
                .pipe(
                  Effect.map(Struct.omit("version")),
                  Effect.tap(notifyDelete),
                ),
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
                .pipe(
                  Effect.map(Struct.omit("version")),
                  Effect.tap(notifyRestore),
                ),
            ),
          },
        );

        return { create, delete: delete_, restore } as const;
      }),
    },
  ) {}
}
