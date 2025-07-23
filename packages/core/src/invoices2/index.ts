import { and, eq, inArray } from "drizzle-orm";
import { Array, Effect } from "effect";

import {
  activeBillingAccountManagerAuthorizationsView,
  activeBillingAccountsView,
} from "../billing-accounts2/sql";
import { Database } from "../database2";
import { activeOrdersView } from "../orders2/sql";
import { activeInvoicesView, invoicesTable } from "./sql";

import type { InferInsertModel } from "drizzle-orm";
import type { BillingAccountManagerAuthorization } from "../billing-accounts2/sql";
import type { Order } from "../orders2/sql";
import type { Invoice, InvoicesTable } from "./sql";

export namespace Invoices {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/invoices/Repository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = invoicesTable;
        const activeView = activeInvoicesView;

        const create = Effect.fn("Invoices.Repository.create")(
          (invoice: InferInsertModel<InvoicesTable>) =>
            db
              .useTransaction((tx) =>
                tx.insert(table).values(invoice).returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const getMetadata = Effect.fn("Invoices.Repository.getMetadata")(
          (tenantId: Invoice["tenantId"]) =>
            db.useTransaction((tx) =>
              tx
                .select({ id: table.id, version: table.version })
                .from(table)
                .where(eq(table.tenantId, tenantId)),
            ),
        );

        const getActiveMetadata = Effect.fn(
          "Invoices.Repository.getActiveMetadata",
        )((tenantId: Invoice["tenantId"]) =>
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
            managerId: BillingAccountManagerAuthorization["managerId"],
            tenantId: Invoice["tenantId"],
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
        )((customerId: Order["customerId"], tenantId: Invoice["tenantId"]) =>
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
          (ids: ReadonlyArray<Invoice["id"]>, tenantId: Invoice["tenantId"]) =>
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
