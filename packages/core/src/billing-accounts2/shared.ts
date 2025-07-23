import { Schema, Struct } from "effect";

import { SyncTable, TenantTable, Timestamps, View } from "../database2/shared";
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
export const billingAccountsTable = SyncTable<BillingAccountsTable>()(
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
export const activeBillingAccountsView = View<ActiveBillingAccountsView>()(
  activeBillingAccountsViewName,
  billingAccountsTable.Schema,
);
export const UpdateBillingAccount = Schema.extend(
  billingAccountsTable.Schema.pick("id", "updatedAt"),
  billingAccountsTable.Schema.omit(
    ...Struct.keys(TenantTable.fields),
    "name",
    "origin",
    "papercutAccountId",
  ).pipe(Schema.partial),
);
export const DeleteBillingAccount = Schema.Struct({
  id: NanoId,
  deletedAt: Schema.Date,
});

export const billingAccountCustomerAuthorizationsTableName =
  "billing_account_customer_authorizations";
export const billingAccountCustomerAuthorizationsTable =
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
export const activeBillingAccountCustomerAuthorizationsView =
  View<ActiveBillingAccountCustomerAuthorizationsView>()(
    activeBillingAccountCustomerAuthorizationsViewName,
    billingAccountCustomerAuthorizationsTable.Schema,
  );
export const CreateBillingAccountCustomerAuthorization =
  billingAccountCustomerAuthorizationsTable.Schema.omit(
    "deletedAt",
    "tenantId",
  );
export const DeleteBillingAccountCustomerAuthorization = Schema.Struct({
  id: NanoId,
  deletedAt: Schema.Date,
});

export const billingAccountManagerAuthorizationsTableName =
  "billing_account_manager_authorizations";
export const billingAccountManagerAuthorizationsTable =
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
export const activeBillingAccountManagerAuthorizationsView =
  View<ActiveBillingAccountManagerAuthorizationsView>()(
    activeBillingAccountManagerAuthorizationsViewName,
    billingAccountManagerAuthorizationsTable.Schema,
  );
export const CreateBillingAccountManagerAuthorization =
  billingAccountManagerAuthorizationsTable.Schema.omit("deletedAt", "tenantId");
export const DeleteBillingAccountManagerAuthorization = Schema.Struct({
  id: NanoId,
  deletedAt: Schema.Date,
});
