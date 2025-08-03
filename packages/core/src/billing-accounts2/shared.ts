import { Schema, Struct } from "effect";

import { SyncTable, TenantTable, Timestamps, View } from "../database2/shared";
import { SyncMutation } from "../sync2/shared";
import { Cost, NanoId } from "../utils2/shared";

import type {
  ActiveBillingAccountCustomerAuthorizationsView,
  ActiveBillingAccountManagerAuthorizationsView,
  ActiveBillingAccountsView,
  BillingAccountCustomerAuthorizationsTable,
  BillingAccountManagerAuthorizationsTable,
  BillingAccountsTable,
} from "./sql";

export const billingAccountOrigins = ["papercut", "internal"] as const;
export type BillingAccountOrigin = (typeof billingAccountOrigins)[number];

export const billingAccountsTableName = "billing_accounts";
export const billingAccounts = SyncTable<BillingAccountsTable>()(
  billingAccountsTableName,
  Schema.Struct({
    id: NanoId,
    tenantId: NanoId,
    origin: Schema.Literal(...billingAccountOrigins),
    name: Schema.String,
    reviewThreshold: Schema.NullOr(
      Schema.transform(Cost, Schema.String, {
        decode: String,
        encode: Number,
        strict: true,
      }),
    ),
    papercutAccountId: Schema.Union(
      Schema.Literal(-1),
      Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    ),
    ...Timestamps.fields,
  }),
  ["read", "update", "delete"],
);
export const activeBillingAccountsViewName = `active_${billingAccountsTableName}`;
export const activeBillingAccounts = View<ActiveBillingAccountsView>()(
  activeBillingAccountsViewName,
  billingAccounts.Schema,
);
export const updateBillingAccount = SyncMutation(
  "updateBillingAccount",
  Schema.extend(
    billingAccounts.Schema.pick("id", "updatedAt"),
    billingAccounts.Schema.omit(
      ...Struct.keys(TenantTable.fields),
      "name",
      "origin",
      "papercutAccountId",
    ).pipe(Schema.partial),
  ),
);
export const deleteBillingAccount = SyncMutation(
  "deleteBillingAccount",
  Schema.Struct({
    id: NanoId,
    deletedAt: Schema.DateTimeUtc,
  }),
);

export const billingAccountCustomerAuthorizationsTableName =
  "billing_account_customer_authorizations";
export const billingAccountCustomerAuthorizations =
  SyncTable<BillingAccountCustomerAuthorizationsTable>()(
    billingAccountCustomerAuthorizationsTableName,
    Schema.Struct({
      ...TenantTable.fields,
      customerId: NanoId,
      billingAccountId: NanoId,
    }),
    ["read"],
  );
export const activeBillingAccountCustomerAuthorizationsViewName = `active_${billingAccountCustomerAuthorizationsTableName}`;
export const activeBillingAccountCustomerAuthorizations =
  View<ActiveBillingAccountCustomerAuthorizationsView>()(
    activeBillingAccountCustomerAuthorizationsViewName,
    billingAccountCustomerAuthorizations.Schema,
  );

export const billingAccountManagerAuthorizationsTableName =
  "billing_account_manager_authorizations";
export const billingAccountManagerAuthorizations =
  SyncTable<BillingAccountManagerAuthorizationsTable>()(
    billingAccountManagerAuthorizationsTableName,
    Schema.Struct({
      ...TenantTable.fields,
      managerId: NanoId,
      billingAccountId: NanoId,
    }),
    ["create", "read", "delete"],
  );
export const activeBillingAccountManagerAuthorizationsViewName = `active_${billingAccountManagerAuthorizationsTableName}`;
export const activeBillingAccountManagerAuthorizations =
  View<ActiveBillingAccountManagerAuthorizationsView>()(
    activeBillingAccountManagerAuthorizationsViewName,
    billingAccountManagerAuthorizations.Schema,
  );
export const createBillingAccountManagerAuthorization = SyncMutation(
  "createBillingAccountManagerAuthorization",
  billingAccountManagerAuthorizations.Schema.omit("deletedAt", "tenantId"),
);
export const deleteBillingAccountManagerAuthorization = SyncMutation(
  "deleteBillingAccountManagerAuthorization",
  Schema.Struct({
    id: NanoId,
    deletedAt: Schema.DateTimeUtc,
  }),
);
