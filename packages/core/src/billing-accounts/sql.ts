import { and, eq, isNotNull } from "drizzle-orm";
import { bigint, index, numeric, text, uniqueIndex } from "drizzle-orm/pg-core";

import { id } from "../drizzle/columns";
import { tenantTable } from "../drizzle/tables";
import { billingAccountType } from "../utils/sql";
import {
  billingAccountCustomerAuthorizationsTableName,
  billingAccountManagerAuthorizationsTableName,
  billingAccountsTableName,
} from "./shared";

import type { InferSelectModel } from "drizzle-orm";

export const billingAccountsTable = tenantTable(
  billingAccountsTableName,
  {
    type: billingAccountType("type").notNull(),
    name: text("name").notNull(),
    reviewThreshold: numeric("review_threshold"),
    papercutAccountId: bigint({ mode: "number" }),
  },
  (table) => [
    uniqueIndex()
      .on(table.type, table.name, table.papercutAccountId, table.tenantId)
      .where(
        and(eq(table.type, "papercut"), isNotNull(table.papercutAccountId))!,
      ),
  ],
);
export type BillingAccountsTable = typeof billingAccountsTable;
export type BillingAccount = InferSelectModel<BillingAccountsTable>;

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
  InferSelectModel<BillingAccountCustomerAuthorizationsTable>;

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
  InferSelectModel<BillingAccountManagerAuthorizationsTable>;
