export const billingAccountsTableName = "billing_accounts";
export const billingAccountCustomerAuthorizationsTableName =
  "billing_account_customer_authorizations";
export const billingAccountManagerAuthorizationsTableName =
  "billing_account_manager_authorizations";

export const billingAccountOrigins = ["papercut", "internal"] as const;
export type BillingAccountOrigin = (typeof billingAccountOrigins)[number];
