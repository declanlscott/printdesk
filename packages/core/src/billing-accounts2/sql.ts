import { isNull } from "drizzle-orm";
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

import type { DatabaseContract } from "../database2/contract";
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
export type BillingAccount =
  DatabaseContract.InferFromTable<BillingAccountsTable>;
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
  DatabaseContract.InferFromView<ActiveBillingAccountsView>;

export const billingAccountCustomerAuthorizationsTable = tenantTable(
  BillingAccountCustomerAuthorizationsContract.tableName,
  {
    customerId: id("customer_id").notNull(),
    billingAccountId: id("billing_account_id").notNull(),
  },
  (table) => [
    uniqueIndex().on(table.customerId, table.billingAccountId, table.tenantId),
    index().on(table.customerId),
  ],
);
export type BillingAccountCustomerAuthorizationsTable =
  typeof billingAccountCustomerAuthorizationsTable;
export type BillingAccountCustomerAuthorization =
  DatabaseContract.InferFromTable<BillingAccountCustomerAuthorizationsTable>;
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
  DatabaseContract.InferFromView<ActiveBillingAccountCustomerAuthorizationsView>;

export const billingAccountManagerAuthorizationsTable = tenantTable(
  BillingAccountManagerAuthorizationsContract.tableName,
  {
    managerId: id("manager_id").notNull(),
    billingAccountId: id("billing_account_id").notNull(),
  },
  (table) => [
    uniqueIndex().on(table.billingAccountId, table.managerId, table.tenantId),
    index().on(table.managerId),
  ],
);
export type BillingAccountManagerAuthorizationsTable =
  typeof billingAccountManagerAuthorizationsTable;
export type BillingAccountManagerAuthorization =
  DatabaseContract.InferFromTable<BillingAccountManagerAuthorizationsTable>;
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
  DatabaseContract.InferFromView<ActiveBillingAccountManagerAuthorizationsView>;
