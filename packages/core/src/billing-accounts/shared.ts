import * as v from "valibot";

import {
  costSchema,
  nanoIdSchema,
  tenantTableSchema,
  timestampsSchema,
} from "../utils/shared";

export const billingAccountsTableName = "billing_accounts";
export const billingAccountCustomerAuthorizationsTableName =
  "billing_account_customer_authorizations";
export const billingAccountManagerAuthorizationsTableName =
  "billing_account_manager_authorizations";

export const billingAccountTypes = ["papercut", "internal"] as const;

export const billingAccountSchema = v.object({
  id: nanoIdSchema,
  tenantId: nanoIdSchema,
  type: v.picklist(billingAccountTypes),
  name: v.string(),
  reviewThreshold: v.nullable(v.pipe(costSchema, v.transform(String))),
  ...timestampsSchema.entries,
});

export const billingAccountMutationNames = [
  "updateBillingAccountReviewThreshold",
  "deleteBillingAccount",
  "createBillingAccountManagerAuthorization",
  "deleteBillingAccountManagerAuthorization",
] as const;

export const billingAccountCustomerAuthorizationSchema = v.object({
  ...tenantTableSchema.entries,
  customerId: nanoIdSchema,
  billingAccountId: nanoIdSchema,
});

export const billingAccountManagerAuthorizationSchema = v.object({
  ...tenantTableSchema.entries,
  managerId: nanoIdSchema,
  billingAccountId: nanoIdSchema,
});

export const updateBillingAccountReviewThresholdMutationArgsSchema = v.pick(
  billingAccountSchema,
  ["id", "reviewThreshold"],
);

export const deleteBillingAccountMutationArgsSchema = v.object({
  id: nanoIdSchema,
  deletedAt: v.date(),
});
export type DeleteBillingAccountMutationArgs = v.InferOutput<
  typeof deleteBillingAccountMutationArgsSchema
>;

export const createBillingAccountManagerAuthorizationMutationArgsSchema =
  v.object({
    ...v.omit(billingAccountManagerAuthorizationSchema, ["deletedAt"]).entries,
    deletedAt: v.null(),
  });
export type CreateBillingAccountManagerAuthorizationMutationArgs =
  v.InferOutput<
    typeof createBillingAccountManagerAuthorizationMutationArgsSchema
  >;

export const deleteBillingAccountManagerAuthorizationMutationArgsSchema =
  v.object({
    id: nanoIdSchema,
    deletedAt: v.date(),
  });
export type DeleteBillingAccountManagerAuthorizationMutationArgs =
  v.InferOutput<
    typeof deleteBillingAccountManagerAuthorizationMutationArgsSchema
  >;
