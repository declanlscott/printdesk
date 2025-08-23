import { and, eq, getViewSelectedFields, isNull } from "drizzle-orm";
import {
  bigint,
  index,
  numeric,
  pgView,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { id, pgEnum, tenantTable } from "../database2/constructors";
import {
  BillingAccountCustomerAuthorizationsContract,
  BillingAccountManagerAuthorizationsContract,
  BillingAccountsContract,
} from "./contracts";

import type { TableContract } from "../database2/contract";
import type { Discriminate } from "../utils/types";

export const billingAccountsTable = tenantTable(
  BillingAccountsContract.tableName,
  {
    origin: pgEnum("origin", BillingAccountsContract.origins)
      .default("internal")
      .notNull(),
    name: text("name").notNull(),
    reviewThreshold: numeric("review_threshold"),
    // NOTE: Set to -1 if the billing account is not a papercut shared account
    papercutAccountId: bigint({ mode: "number" }).notNull().default(-1),
  },
  (table) => [
    uniqueIndex().on(
      table.origin,
      table.name,
      table.papercutAccountId,
      table.tenantId,
    ),
  ],
);
export type BillingAccountsTable = typeof billingAccountsTable;
export type BillingAccount = TableContract.Infer<BillingAccountsTable>;
export type BillingAccountByOrigin<
  TBillingAccountOrigin extends BillingAccount["origin"],
> = Discriminate<BillingAccount, "origin", TBillingAccountOrigin>;
export const activeBillingAccountsView = pgView(
  BillingAccountsContract.activeViewName,
).as((qb) =>
  qb
    .select()
    .from(billingAccountsTable)
    .where(isNull(billingAccountsTable.deletedAt)),
);
export type ActiveBillingAccountsView = typeof activeBillingAccountsView;
export type ActiveBillingAccount =
  TableContract.InferFromView<ActiveBillingAccountsView>;
export const activeCustomerAuthorizedBillingAccountsView = pgView(
  BillingAccountsContract.activeCustomerAuthorizedViewName,
).as((qb) =>
  qb
    .select({
      ...getViewSelectedFields(activeBillingAccountsView),
      authorizedCustomerId:
        activeBillingAccountCustomerAuthorizationsView.customerId,
    })
    .from(activeBillingAccountsView)
    .innerJoin(
      activeBillingAccountCustomerAuthorizationsView,
      and(
        eq(
          activeBillingAccountsView.id,
          activeBillingAccountCustomerAuthorizationsView.billingAccountId,
        ),
        eq(
          activeBillingAccountsView.tenantId,
          activeBillingAccountCustomerAuthorizationsView.tenantId,
        ),
      ),
    ),
);
export type ActiveCustomerAuthorizedBillingAccountsView =
  typeof activeCustomerAuthorizedBillingAccountsView;
export type ActiveCustomerAuthorizedBillingAccount =
  TableContract.InferFromView<ActiveCustomerAuthorizedBillingAccountsView>;
export const activeManagerAuthorizedBillingAccountsView = pgView(
  BillingAccountsContract.activeManagerAuthorizedViewName,
).as((qb) =>
  qb
    .select({
      ...getViewSelectedFields(activeBillingAccountsView),
      authorizedManagerId:
        activeBillingAccountManagerAuthorizationsView.managerId,
    })
    .from(activeBillingAccountsView)
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
    ),
);
export type ActiveManagerAuthorizedBillingAccountsView =
  typeof activeManagerAuthorizedBillingAccountsView;
export type ActiveManagerAuthorizedBillingAccount =
  TableContract.InferFromView<ActiveManagerAuthorizedBillingAccountsView>;

export const billingAccountCustomerAuthorizationsTable = tenantTable(
  BillingAccountCustomerAuthorizationsContract.tableName,
  {
    customerId: id<TableContract.EntityId>("customer_id").notNull(),
    billingAccountId:
      id<TableContract.EntityId>("billing_account_id").notNull(),
  },
  (table) => [
    uniqueIndex().on(table.customerId, table.billingAccountId, table.tenantId),
    index().on(table.customerId),
  ],
);
export type BillingAccountCustomerAuthorizationsTable =
  typeof billingAccountCustomerAuthorizationsTable;
export type BillingAccountCustomerAuthorization =
  TableContract.Infer<BillingAccountCustomerAuthorizationsTable>;
export const activeBillingAccountCustomerAuthorizationsView = pgView(
  BillingAccountCustomerAuthorizationsContract.activeViewName,
).as((qb) =>
  qb
    .select()
    .from(billingAccountCustomerAuthorizationsTable)
    .where(isNull(billingAccountCustomerAuthorizationsTable.deletedAt)),
);
export type ActiveBillingAccountCustomerAuthorizationsView =
  typeof activeBillingAccountCustomerAuthorizationsView;
export type ActiveBillingAccountCustomerAuthorization =
  TableContract.InferFromView<ActiveBillingAccountCustomerAuthorizationsView>;

export const billingAccountManagerAuthorizationsTable = tenantTable(
  BillingAccountManagerAuthorizationsContract.tableName,
  {
    managerId: id<TableContract.EntityId>("manager_id").notNull(),
    billingAccountId:
      id<TableContract.EntityId>("billing_account_id").notNull(),
  },
  (table) => [
    uniqueIndex().on(table.billingAccountId, table.managerId, table.tenantId),
    index().on(table.managerId),
  ],
);
export type BillingAccountManagerAuthorizationsTable =
  typeof billingAccountManagerAuthorizationsTable;
export type BillingAccountManagerAuthorization =
  TableContract.Infer<BillingAccountManagerAuthorizationsTable>;
export const activeBillingAccountManagerAuthorizationsView = pgView(
  BillingAccountManagerAuthorizationsContract.activeViewName,
).as((qb) =>
  qb
    .select()
    .from(billingAccountManagerAuthorizationsTable)
    .where(isNull(billingAccountManagerAuthorizationsTable.deletedAt)),
);
export type ActiveBillingAccountManagerAuthorizationsView =
  typeof activeBillingAccountManagerAuthorizationsView;
export type ActiveBillingAccountManagerAuthorization =
  TableContract.InferFromView<ActiveBillingAccountManagerAuthorizationsView>;
export const activeCustomerAuthorizedBillingAccountManagerAuthorizationsView =
  pgView(
    BillingAccountManagerAuthorizationsContract.activeCustomerAuthorizedViewName,
  ).as((qb) =>
    qb
      .select({
        ...getViewSelectedFields(activeBillingAccountManagerAuthorizationsView),
        authorizedCustomerId:
          activeBillingAccountCustomerAuthorizationsView.customerId,
      })
      .from(activeBillingAccountManagerAuthorizationsView)
      .innerJoin(
        activeBillingAccountCustomerAuthorizationsView,
        and(
          eq(
            activeBillingAccountManagerAuthorizationsView.billingAccountId,
            activeBillingAccountCustomerAuthorizationsView.billingAccountId,
          ),
          eq(
            activeBillingAccountManagerAuthorizationsView.tenantId,
            activeBillingAccountCustomerAuthorizationsView.tenantId,
          ),
        ),
      ),
  );
export type ActiveCustomerAuthorizedBillingAccountManagerAuthorizationsView =
  typeof activeCustomerAuthorizedBillingAccountManagerAuthorizationsView;
export type ActiveCustomerAuthorizedBillingAccountManagerAuthorization =
  TableContract.InferFromView<ActiveCustomerAuthorizedBillingAccountManagerAuthorizationsView>;
