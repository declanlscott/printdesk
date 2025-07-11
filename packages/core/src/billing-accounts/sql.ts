import { bigint, index, numeric, text, uniqueIndex } from "drizzle-orm/pg-core";

import { customEnum, id } from "../database/columns";
import { tenantTable } from "../database/tables";
import {
  billingAccountCustomerAuthorizationsTableName,
  billingAccountManagerAuthorizationsTableName,
  billingAccountOrigins,
  billingAccountsTableName,
} from "./shared";

import type { InferFromTable } from "../database/tables";
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
