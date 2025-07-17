import { Schema } from "effect";

import { TenantTable, Timestamps } from "../database2/constructors";
import { Cost, NanoId } from "../utils2/shared";

export const billingAccountOrigins = ["papercut", "internal"] as const;
export type BillingAccountOrigin = (typeof billingAccountOrigins)[number];

export const billingAccountsTableName = "billing_accounts";
export const BillingAccount = Schema.Struct({
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
});
export const UpdateBillingAccount = Schema.extend(
  Schema.Struct({
    id: NanoId,
    updatedAt: Schema.Date,
  }),
  BillingAccount.pick("reviewThreshold").pipe(Schema.partial),
);
export const DeleteBillingAccount = Schema.Struct({
  id: NanoId,
  deletedAt: Schema.Date,
});

export const billingAccountCustomerAuthorizationsTableName =
  "billing_account_customer_authorizations";
export const BillingAccountCustomerAuthorization = Schema.Struct({
  ...TenantTable.fields,
  customerId: NanoId,
  billingAccountId: NanoId,
});
export const CreateBillingAccountCustomerAuthorization = Schema.Struct({
  ...BillingAccountCustomerAuthorization.omit("deletedAt").fields,
  deletedAt: Schema.Null,
});
export const DeleteBillingAccountCustomerAuthorization = Schema.Struct({
  id: NanoId,
  deletedAt: Schema.Date,
});

export const billingAccountManagerAuthorizationsTableName =
  "billing_account_manager_authorizations";
export const BillingAccountManagerAuthorization = Schema.Struct({
  ...TenantTable.fields,
  managerId: NanoId,
  billingAccountId: NanoId,
});
