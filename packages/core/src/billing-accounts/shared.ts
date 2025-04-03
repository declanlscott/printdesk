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

export const billingAccountOrigins = ["papercut", "internal"] as const;
export type BillingAccountOrigin = (typeof billingAccountOrigins)[number];

export const billingAccountSchema = v.object({
  id: nanoIdSchema,
  tenantId: nanoIdSchema,
  origin: v.picklist(billingAccountOrigins),
  name: v.string(),
  reviewThreshold: v.nullable(v.pipe(costSchema, v.transform(String))),
  papercutAccountId: v.union([
    v.literal(-1),
    v.pipe(v.number(), v.integer(), v.minValue(0)),
  ]),
  ...timestampsSchema.entries,
});

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
