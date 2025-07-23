import { isNull } from "drizzle-orm";
import {
  bigint,
  index,
  numeric,
  pgView,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { customEnum, id } from "../database2/columns";
import { tenantTable } from "../database2/tables";
import {
  activeBillingAccountCustomerAuthorizationsViewName,
  activeBillingAccountManagerAuthorizationsViewName,
  activeBillingAccountsViewName,
  billingAccountCustomerAuthorizationsTableName,
  billingAccountManagerAuthorizationsTableName,
  billingAccountOrigins,
  billingAccountsTableName,
} from "./shared";

import type { InferFromTable, InferFromView } from "../database2/shared";
import type { Discriminate } from "../utils/types";

const billingAccountOrigin = (name: string) =>
  customEnum(name, billingAccountOrigins);

export const billingAccountsTable = tenantTable(
  billingAccountsTableName,
  {
    origin: billingAccountOrigin("origin").default("internal").notNull(),
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
export type BillingAccount = InferFromTable<BillingAccountsTable>;
export type BillingAccountByOrigin<
  TBillingAccountOrigin extends BillingAccount["origin"],
> = Discriminate<BillingAccount, "origin", TBillingAccountOrigin>;
export const activeBillingAccountsView = pgView(
  activeBillingAccountsViewName,
).as((qb) =>
  qb
    .select()
    .from(billingAccountsTable)
    .where(isNull(billingAccountsTable.deletedAt)),
);
export type ActiveBillingAccountsView = typeof activeBillingAccountsView;
export type ActiveBillingAccount = InferFromView<ActiveBillingAccountsView>;

export const billingAccountCustomerAuthorizationsTable = tenantTable(
  billingAccountCustomerAuthorizationsTableName,
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
  InferFromTable<BillingAccountCustomerAuthorizationsTable>;
export const activeBillingAccountCustomerAuthorizationsView = pgView(
  activeBillingAccountCustomerAuthorizationsViewName,
).as((qb) =>
  qb
    .select()
    .from(billingAccountCustomerAuthorizationsTable)
    .where(isNull(billingAccountCustomerAuthorizationsTable.deletedAt)),
);
export type ActiveBillingAccountCustomerAuthorizationsView =
  typeof activeBillingAccountCustomerAuthorizationsView;
export type ActiveBillingAccountCustomerAuthorization =
  InferFromView<ActiveBillingAccountCustomerAuthorizationsView>;

export const billingAccountManagerAuthorizationsTable = tenantTable(
  billingAccountManagerAuthorizationsTableName,
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
  InferFromTable<BillingAccountManagerAuthorizationsTable>;
export const activeBillingAccountManagerAuthorizationsView = pgView(
  activeBillingAccountManagerAuthorizationsViewName,
).as((qb) =>
  qb
    .select()
    .from(billingAccountManagerAuthorizationsTable)
    .where(isNull(billingAccountManagerAuthorizationsTable.deletedAt)),
);
export type ActiveBillingAccountManagerAuthorizationsView =
  typeof activeBillingAccountManagerAuthorizationsView;
export type ActiveBillingAccountManagerAuthorization =
  InferFromView<ActiveBillingAccountManagerAuthorizationsView>;
