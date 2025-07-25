import { and, eq, inArray, not, or } from "drizzle-orm";
import { Array, Effect } from "effect";

import { AccessControl } from "../access-control2";
import { Database } from "../database2";
import { buildConflictSet } from "../database2/constructors";
import { activeUsersView } from "../users2/sql";
import {
  activeBillingAccountCustomerAuthorizationsView,
  activeBillingAccountManagerAuthorizationsView,
  activeBillingAccountsView,
  billingAccountCustomerAuthorizationsTable,
  billingAccountManagerAuthorizationsTable,
  billingAccountsTable,
} from "./sql";

import type { InferInsertModel } from "drizzle-orm";
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
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = billingAccountsTable;
        const activeView = activeBillingAccountsView;
        const activeCustomerAuthorizationsView =
          activeBillingAccountCustomerAuthorizationsView;
        const activeManagerAuthorizationsView =
          activeBillingAccountManagerAuthorizationsView;

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

        const getMetadata = Effect.fn("BillingAccounts.Repository.getMetadata")(
          (tenantId: BillingAccount["tenantId"]) =>
            db.useTransaction((tx) =>
              tx
                .select({ id: table.id, version: table.version })
                .from(table)
                .where(eq(table.tenantId, tenantId)),
            ),
        );

        const getActiveMetadata = Effect.fn(
          "BillingAccounts.Repository.getActiveMetadata",
        )((tenantId: BillingAccount["tenantId"]) =>
          db.useTransaction((tx) =>
            tx
              .select({ id: activeView.id, version: activeView.version })
              .from(activeView)
              .where(eq(activeView.tenantId, tenantId)),
          ),
        );

        const getActiveMetadataByCustomerId = Effect.fn(
          "BillingAccounts.Repository.getActiveMetadataByCustomerId",
        )(
          (
            customerId: BillingAccountCustomerAuthorization["customerId"],
            tenantId: BillingAccount["tenantId"],
          ) =>
            db.useTransaction((tx) =>
              tx
                .select({ id: activeView.id, version: activeView.version })
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
                    eq(activeCustomerAuthorizationsView.customerId, customerId),
                    eq(activeView.tenantId, tenantId),
                  ),
                ),
            ),
        );

        const findByIds = Effect.fn("BillingAccounts.Repository.findByIds")(
          (
            ids: ReadonlyArray<BillingAccount["id"]>,
            tenantId: BillingAccount["tenantId"],
          ) =>
            db.useTransaction((tx) =>
              tx
                .select()
                .from(table)
                .where(
                  and(inArray(table.id, ids), eq(table.tenantId, tenantId)),
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
          getMetadata,
          getActiveMetadata,
          getActiveMetadataByCustomerId,
          findByIds,
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

  export class Policy extends Effect.Service<Policy>()(
    "@printdesk/core/billing-accounts/Policy",
    {
      dependencies: [Repository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const hasActiveManagerAuthorization = Effect.fn(
          "BillingAccounts.Policy.hasActiveManagerAuthorization",
        )((id: BillingAccount["id"]) =>
          AccessControl.policy((principal) =>
            repository
              .findActiveCustomerIds(id, principal.tenantId)
              .pipe(
                Effect.map(
                  Array.some((customerId) => customerId === principal.userId),
                ),
              ),
          ),
        );

        const hasActiveCustomerAuthorization = Effect.fn(
          "BillingAccounts.Policy.hasActiveCustomerAuthorization",
        )((id: BillingAccount["id"]) =>
          AccessControl.policy((principal) =>
            repository
              .findActiveManagerIds(id, principal.tenantId)
              .pipe(
                Effect.map(
                  Array.some((managerId) => managerId === principal.userId),
                ),
              ),
          ),
        );

        const hasActiveAuthorization = Effect.fn(
          "BillingAccounts.Policy.hasActiveAuthorization",
        )((id: BillingAccount["id"]) =>
          AccessControl.policy((principal) =>
            repository
              .findActiveAuthorizedUserIds(id, principal.tenantId)
              .pipe(
                Effect.map(Array.some((userId) => userId === principal.userId)),
              ),
          ),
        );

        return {
          hasActiveManagerAuthorization,
          hasActiveCustomerAuthorization,
          hasActiveAuthorization,
        } as const;
      }),
    },
  ) {}

  export class CustomerAuthorizationsRepository extends Effect.Service<CustomerAuthorizationsRepository>()(
    "@printdesk/core/billing-accounts/CustomerAuthorizationsRepository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = billingAccountCustomerAuthorizationsTable;
        const activeView = activeBillingAccountCustomerAuthorizationsView;

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

        const getMetadata = Effect.fn(
          "BillingAccount.CustomerAuthorizationsRepository.getMetadata",
        )((tenantId: BillingAccountCustomerAuthorization["tenantId"]) =>
          db.useTransaction((tx) =>
            tx
              .select({ id: table.id, version: table.version })
              .from(table)
              .where(eq(table.tenantId, tenantId)),
          ),
        );

        const getActiveMetadata = Effect.fn(
          "BillingAccount.CustomerAuthorizationsRepository.getActiveMetadata",
        )((tenantId: BillingAccountCustomerAuthorization["tenantId"]) =>
          db.useTransaction((tx) =>
            tx
              .select({ id: activeView.id, version: activeView.version })
              .from(activeView)
              .where(eq(activeView.tenantId, tenantId)),
          ),
        );

        const getActiveMetadataByCustomerId = Effect.fn(
          "BillingAccounts.CustomerAuthorizationsRepository.getActiveMetadataByCustomerId",
        )(
          (
            customerId: BillingAccountCustomerAuthorization["customerId"],
            tenantId: BillingAccountCustomerAuthorization["tenantId"],
          ) =>
            db.useTransaction((tx) =>
              tx
                .select({ id: activeView.id, version: activeView.version })
                .from(activeView)
                .where(
                  and(
                    eq(activeView.customerId, customerId),
                    eq(activeView.tenantId, tenantId),
                  ),
                ),
            ),
        );

        const findByIds = Effect.fn(
          "BillingAccounts.CustomerAuthorizationsRepository.findByIds",
        )(
          (
            ids: ReadonlyArray<BillingAccountCustomerAuthorization["id"]>,
            tenantId: BillingAccountCustomerAuthorization["tenantId"],
          ) =>
            db.useTransaction((tx) =>
              tx
                .select()
                .from(table)
                .where(
                  and(inArray(table.id, ids), eq(table.tenantId, tenantId)),
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
          getMetadata,
          getActiveMetadata,
          getActiveMetadataByCustomerId,
          findByIds,
          findByOrigin,
        } as const;
      }),
    },
  ) {}

  export class ManagerAuthorizationsRepository extends Effect.Service<ManagerAuthorizationsRepository>()(
    "@printdesk/core/billing-accounts/ManagerAuthorizationsRepository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = billingAccountManagerAuthorizationsTable;
        const activeView = activeBillingAccountManagerAuthorizationsView;
        const activeCustomerAuthorizationView =
          activeBillingAccountCustomerAuthorizationsView;

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

        const getMetadata = Effect.fn(
          "BillingAccounts.ManagerAuthorizationsRepository.getMetadata",
        )((tenantId: BillingAccountManagerAuthorization["tenantId"]) =>
          db.useTransaction((tx) =>
            tx
              .select({ id: table.id, version: table.version })
              .from(table)
              .where(eq(table.tenantId, tenantId)),
          ),
        );

        const getActiveMetadata = Effect.fn(
          "BillingAccounts.ManagerAuthorizationsRepository.getActiveMetadata",
        )((tenantId: BillingAccountManagerAuthorization["tenantId"]) =>
          db.useTransaction((tx) =>
            tx
              .select({ id: activeView.id, version: activeView.version })
              .from(activeView)
              .where(eq(activeView.tenantId, tenantId)),
          ),
        );

        const getActiveMetadataByCustomerId = Effect.fn(
          "BillingAccounts.ManagerAuthorizationsRepository.getActiveMetadataByCustomerId",
        )(
          (
            customerId: BillingAccountCustomerAuthorization["customerId"],
            tenantId: BillingAccountManagerAuthorization["tenantId"],
          ) =>
            db.useTransaction((tx) =>
              tx
                .select({ id: activeView.id, version: activeView.version })
                .from(activeView)
                .innerJoin(
                  activeCustomerAuthorizationView,
                  and(
                    eq(
                      activeView.billingAccountId,
                      activeCustomerAuthorizationView.billingAccountId,
                    ),
                    eq(
                      activeView.tenantId,
                      activeCustomerAuthorizationView.tenantId,
                    ),
                  ),
                )
                .where(
                  and(
                    eq(activeCustomerAuthorizationView.customerId, customerId),
                    eq(activeView.tenantId, tenantId),
                  ),
                ),
            ),
        );

        const findByIds = Effect.fn(
          "BillingAccounts.ManagerAuthorizationsRepository.findByIds",
        )(
          (
            ids: ReadonlyArray<BillingAccountManagerAuthorization["id"]>,
            tenantId: BillingAccountManagerAuthorization["tenantId"],
          ) =>
            db.useTransaction((tx) =>
              tx
                .select()
                .from(table)
                .where(
                  and(inArray(table.id, ids), eq(table.tenantId, tenantId)),
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
          getMetadata,
          getActiveMetadata,
          getActiveMetadataByCustomerId,
          findByIds,
          deleteById,
        } as const;
      }),
    },
  ) {}
}
