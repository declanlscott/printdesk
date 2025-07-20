import { and, eq, inArray } from "drizzle-orm";
import { Array, Effect } from "effect";

import { Database } from "../database2";
import * as schema from "../database2/schema";

import type { InferInsertModel } from "drizzle-orm";

export namespace Invoices {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/invoices/Repository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = schema.invoicesTable.table;
        const activeView = schema.activeInvoicesView.view;
        const activeOrdersView = schema.activeOrdersView.view;
        const activeBillingAccountsView = schema.activeBillingAccountsView.view;
        const activeBillingAccountManagerAuthorizationsView =
          schema.activeBillingAccountManagerAuthorizationsView.view;

        const create = Effect.fn("Invoices.Repository.create")(
          (invoice: InferInsertModel<schema.InvoicesTable>) =>
            db
              .useTransaction((tx) =>
                tx.insert(table).values(invoice).returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const getMetadata = Effect.fn("Invoices.Repository.getMetadata")(
          (tenantId: schema.Invoice["tenantId"]) =>
            db.useTransaction((tx) =>
              tx
                .select({ id: table.id, version: table.version })
                .from(table)
                .where(eq(table.tenantId, tenantId)),
            ),
        );

        const getActiveMetadata = Effect.fn(
          "Invoices.Repository.getActiveMetadata",
        )((tenantId: schema.Invoice["tenantId"]) =>
          db.useTransaction((tx) =>
            tx
              .select({ id: activeView.id, version: activeView.version })
              .from(activeView)
              .where(eq(activeView.tenantId, tenantId)),
          ),
        );

        const getActiveMetadataByOrderBillingAccountManagerId = Effect.fn(
          "Invoices.Repository.getActiveMetadataByOrderBillingAccountManagerId",
        )(
          (
            managerId: schema.BillingAccountManagerAuthorization["managerId"],
            tenantId: schema.Invoice["tenantId"],
          ) =>
            db.useTransaction((tx) =>
              tx
                .select({ id: activeView.id, version: activeView.version })
                .from(activeView)
                .innerJoin(
                  activeOrdersView,
                  and(
                    eq(activeView.orderId, activeOrdersView.id),
                    eq(activeOrdersView.tenantId, activeOrdersView.tenantId),
                  ),
                )
                .innerJoin(
                  activeBillingAccountsView,
                  and(
                    eq(
                      activeOrdersView.billingAccountId,
                      activeBillingAccountsView.id,
                    ),
                    eq(
                      activeOrdersView.tenantId,
                      activeBillingAccountsView.tenantId,
                    ),
                  ),
                )
                .innerJoin(
                  activeBillingAccountManagerAuthorizationsView,
                  and(
                    eq(
                      activeBillingAccountsView.id,
                      activeBillingAccountManagerAuthorizationsView.billingAccountId,
                    ),
                    eq(
                      activeBillingAccountsView.tenantId,
                      activeBillingAccountManagerAuthorizationsView.tenantId,
                    ),
                  ),
                )
                .where(
                  and(
                    eq(
                      activeBillingAccountManagerAuthorizationsView.managerId,
                      managerId,
                    ),
                    eq(activeView.tenantId, tenantId),
                  ),
                ),
            ),
        );

        const getActiveMetadataByOrderCustomerId = Effect.fn(
          "Invoices.Repository.getActiveMetadataByOrderCustomerId",
        )(
          (
            customerId: schema.Order["customerId"],
            tenantId: schema.Invoice["tenantId"],
          ) =>
            db.useTransaction((tx) =>
              tx
                .select({ id: activeView.id, version: activeView.version })
                .from(activeView)
                .innerJoin(
                  activeOrdersView,
                  and(
                    eq(activeView.orderId, activeOrdersView.id),
                    eq(activeView.tenantId, activeOrdersView.tenantId),
                  ),
                )
                .where(
                  and(
                    eq(activeOrdersView.customerId, customerId),
                    eq(activeView.tenantId, tenantId),
                  ),
                ),
            ),
        );

        const findByIds = Effect.fn("Invoices.Repository.findByIds")(
          (
            ids: ReadonlyArray<schema.Invoice["id"]>,
            tenantId: schema.Invoice["tenantId"],
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

        return {
          create,
          getMetadata,
          getActiveMetadata,
          getActiveMetadataByOrderBillingAccountManagerId,
          getActiveMetadataByOrderCustomerId,
          findByIds,
        } as const;
      }),
    },
  ) {}
}
