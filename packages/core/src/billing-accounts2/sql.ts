import { isNull } from "drizzle-orm";
import {
  bigint,
  index,
  numeric,
  pgView,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import {
  customEnum,
  id,
  SyncTable,
  tenantTable,
  View,
} from "../database2/constructors";
import {
  billingAccountCustomerAuthorizationsTableName,
  billingAccountManagerAuthorizationsTableName,
  billingAccountOrigins,
  billingAccountsTableName,
} from "./shared";

import type { InferFromTable } from "../database2/constructors";
import type { Discriminate } from "../utils/types";

const billingAccountOrigin = (name: string) =>
  customEnum(name, billingAccountOrigins);

export const billingAccountsTable = SyncTable(
  tenantTable(
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
  ),
  ["read", "update", "delete"],
);
export type BillingAccountsTable = (typeof billingAccountsTable)["table"];
export type BillingAccount = InferFromTable<BillingAccountsTable>;
export type BillingAccountByOrigin<
  TBillingAccountOrigin extends BillingAccount["origin"],
> = Discriminate<BillingAccount, "origin", TBillingAccountOrigin>;
export const activeBillingAccountsView = View(
  pgView(`active_${billingAccountsTableName}`).as((qb) =>
    qb
      .select()
      .from(billingAccountsTable.table)
      .where(isNull(billingAccountsTable.table.deletedAt)),
  ),
);

export const billingAccountCustomerAuthorizationsTable = SyncTable(
  tenantTable(
    billingAccountCustomerAuthorizationsTableName,
    {
      customerId: id("customer_id").notNull(),
      billingAccountId: id("billing_account_id").notNull(),
    },
    (table) => [
      uniqueIndex().on(
        table.customerId,
        table.billingAccountId,
        table.tenantId,
      ),
      index().on(table.customerId),
    ],
  ),
  ["read"],
);
export type BillingAccountCustomerAuthorizationsTable =
  (typeof billingAccountCustomerAuthorizationsTable)["table"];
export type BillingAccountCustomerAuthorization =
  InferFromTable<BillingAccountCustomerAuthorizationsTable>;
export const activeBillingAccountCustomerAuthorizationsView = View(
  pgView(`active_${billingAccountCustomerAuthorizationsTableName}`).as((qb) =>
    qb
      .select()
      .from(billingAccountCustomerAuthorizationsTable.table)
      .where(isNull(billingAccountCustomerAuthorizationsTable.table.deletedAt)),
  ),
);

export const billingAccountManagerAuthorizationsTable = SyncTable(
  tenantTable(
    billingAccountManagerAuthorizationsTableName,
    {
      managerId: id("manager_id").notNull(),
      billingAccountId: id("billing_account_id").notNull(),
    },
    (table) => [
      uniqueIndex().on(table.billingAccountId, table.managerId, table.tenantId),
      index().on(table.managerId),
    ],
  ),
  ["create", "read", "delete"],
);
export type BillingAccountManagerAuthorizationsTable =
  (typeof billingAccountManagerAuthorizationsTable)["table"];
export type BillingAccountManagerAuthorization =
  InferFromTable<BillingAccountManagerAuthorizationsTable>;
export const activeBillingAccountManagerAuthorizationsView = View(
  pgView(`active_${billingAccountManagerAuthorizationsTableName}`).as((qb) =>
    qb
      .select()
      .from(billingAccountManagerAuthorizationsTable.table)
      .where(isNull(billingAccountManagerAuthorizationsTable.table.deletedAt)),
  ),
);
