import { and, eq, inArray, isNull, not } from "drizzle-orm";
import { Array, Effect } from "effect";

import { AccessControl } from "../access-control2";
import { Database } from "../database2";
import { buildConflictSet } from "../database2/constructors";
import * as schema from "../database2/schema";

import type { InferInsertModel } from "drizzle-orm";

export namespace BillingAccounts {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/billing-accounts/Repository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = schema.billingAccountsTable.table;

        const upsertMany = Effect.fn("BillingAccounts.Repository.upsertMany")(
          (values: Array<InferInsertModel<schema.BillingAccountsTable>>) =>
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

        const findByIds = Effect.fn("BillingAccounts.Repository.findByIds")(
          (
            ids: ReadonlyArray<schema.BillingAccount["id"]>,
            tenantId: schema.BillingAccount["tenantId"],
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
          <TBillingAccountOrigin extends schema.BillingAccount["origin"]>(
            origin: TBillingAccountOrigin,
            tenantId: schema.BillingAccount["tenantId"],
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

        const findCustomers = Effect.fn(
          "BillingAccounts.Repository.findCustomers",
        )(
          (
            id: schema.BillingAccount["id"],
            tenantId: schema.BillingAccount["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .select({ customers: schema.usersTable.table })
                  .from(table)
                  .innerJoin(
                    schema.billingAccountCustomerAuthorizationsTable.table,
                    and(
                      eq(
                        table.id,
                        schema.billingAccountCustomerAuthorizationsTable.table
                          .billingAccountId,
                      ),
                      eq(
                        table.tenantId,
                        schema.billingAccountCustomerAuthorizationsTable.table
                          .tenantId,
                      ),
                    ),
                  )
                  .innerJoin(
                    schema.usersTable.table,
                    and(
                      eq(
                        schema.billingAccountCustomerAuthorizationsTable.table
                          .customerId,
                        schema.usersTable.table.id,
                      ),
                      eq(
                        schema.billingAccountCustomerAuthorizationsTable.table
                          .tenantId,
                        schema.usersTable.table.tenantId,
                      ),
                    ),
                  )
                  .where(
                    and(
                      eq(table.id, id),
                      eq(table.tenantId, tenantId),
                      isNull(table.deletedAt),
                      isNull(
                        schema.billingAccountCustomerAuthorizationsTable.table
                          .deletedAt,
                      ),
                    ),
                  ),
              )
              .pipe(Effect.map(Array.map(({ customers }) => customers))),
        );

        const findManagers = Effect.fn(
          "BillingAccounts.Repository.findManagers",
        )(
          (
            id: schema.BillingAccount["id"],
            tenantId: schema.BillingAccount["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .select({ managers: schema.usersTable.table })
                  .from(table)
                  .innerJoin(
                    schema.billingAccountManagerAuthorizationsTable.table,
                    and(
                      eq(
                        table.id,
                        schema.billingAccountManagerAuthorizationsTable.table
                          .billingAccountId,
                      ),
                      eq(
                        table.tenantId,
                        schema.billingAccountManagerAuthorizationsTable.table
                          .tenantId,
                      ),
                    ),
                  )
                  .innerJoin(
                    schema.usersTable.table,
                    and(
                      eq(
                        schema.billingAccountManagerAuthorizationsTable.table
                          .managerId,
                        schema.usersTable.table.id,
                      ),
                      eq(
                        schema.billingAccountManagerAuthorizationsTable.table
                          .tenantId,
                        schema.usersTable.table.tenantId,
                      ),
                    ),
                  )
                  .where(
                    and(
                      eq(table.id, id),
                      eq(table.tenantId, tenantId),
                      isNull(table.deletedAt),
                      isNull(
                        schema.billingAccountManagerAuthorizationsTable.table
                          .deletedAt,
                      ),
                    ),
                  ),
              )
              .pipe(Effect.map(Array.map(({ managers }) => managers))),
        );

        const delete_ = Effect.fn("BillingAccounts.Repository.delete")(
          (
            id: schema.BillingAccount["id"],
            deletedAt: NonNullable<schema.BillingAccount["deletedAt"]>,
            tenantId: schema.BillingAccount["tenantId"],
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
          findByIds,
          findByOrigin,
          findCustomers,
          findManagers,
          delete: delete_,
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

        const isCustomer = Effect.fn("BillingAccounts.Policy.isCustomer")(
          (id: schema.BillingAccount["id"]) =>
            AccessControl.policy((principal) =>
              repository
                .findCustomers(id, principal.tenantId)
                .pipe(
                  Effect.map((customers) =>
                    customers.some(
                      (customer) => customer.id === principal.userId,
                    ),
                  ),
                ),
            ),
        );

        const isManager = Effect.fn("BillingAccounts.Policy.isManager")(
          (id: schema.BillingAccount["id"]) =>
            AccessControl.policy((principal) =>
              repository
                .findManagers(id, principal.tenantId)
                .pipe(
                  Effect.map((managers) =>
                    managers.some((manager) => manager.id === principal.userId),
                  ),
                ),
            ),
        );

        return { isCustomer, isManager } as const;
      }),
    },
  ) {}

  export class CustomerAuthorizationsRepository extends Effect.Service<CustomerAuthorizationsRepository>()(
    "@printdesk/core/billing-accounts/CustomerAuthorizationsRepository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = schema.billingAccountCustomerAuthorizationsTable.table;

        const upsertMany = Effect.fn(
          "BillingAccounts.CustomerAuthorizationsRepository.upsertMany",
        )(
          (
            values: Array<
              InferInsertModel<schema.BillingAccountCustomerAuthorizationsTable>
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

        const findByIds = Effect.fn(
          "BillingAccounts.CustomerAuthorizationsRepository.findByIds",
        )(
          (
            ids: ReadonlyArray<
              schema.BillingAccountCustomerAuthorization["id"]
            >,
            tenantId: schema.Tenant["id"],
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
          <TBillingAccountOrigin extends schema.BillingAccount["origin"]>(
            origin: TBillingAccountOrigin,
            tenantId: schema.Tenant["id"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .select({ customerAuthorization: table })
                  .from(table)
                  .innerJoin(
                    schema.billingAccountsTable.table,
                    and(
                      eq(
                        schema.billingAccountsTable.table.id,
                        table.billingAccountId,
                      ),
                      eq(
                        schema.billingAccountsTable.table.tenantId,
                        table.tenantId,
                      ),
                    ),
                  )
                  .where(
                    and(
                      eq(schema.billingAccountsTable.table.origin, origin),
                      origin === "papercut"
                        ? not(
                            eq(
                              schema.billingAccountsTable.table
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

        return { upsertMany, findByIds, findByOrigin } as const;
      }),
    },
  ) {}

  export class ManagerAuthorizationsRepository extends Effect.Service<ManagerAuthorizationsRepository>()(
    "@printdesk/core/billing-accounts/ManagerAuthorizationsRepository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = schema.billingAccountManagerAuthorizationsTable.table;

        const create = Effect.fn(
          "BillingAccounts.ManagerAuthorizationsRepository.create",
        )(
          (
            authorization: InferInsertModel<schema.BillingAccountManagerAuthorizationsTable>,
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

        const findByIds = Effect.fn(
          "BillingAccounts.ManagerAuthorizationsRepository.findByIds",
        )(
          (
            ids: ReadonlyArray<schema.BillingAccountManagerAuthorization["id"]>,
            tenantId: schema.Tenant["id"],
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

        const delete_ = Effect.fn(
          "BillingAccounts.ManagerAuthorizationsRepository.delete",
        )(
          (
            id: schema.BillingAccountManagerAuthorization["id"],
            deletedAt: Date,
            tenantId: schema.Tenant["id"],
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

        return { create, findByIds, delete: delete_ } as const;
      }),
    },
  ) {}
}
