import * as v from "valibot";

import { orderAttributesSchema } from "../orders/shared";
import { nanoIdSchema, tenantTableSchema } from "../utils/shared";

export const invoicesTableName = "invoices";

export const invoiceStatuses = ["error", "processing", "charged"] as const;

export const lineItemV1Schema = v.object({
  version: v.fallback(v.literal(1), 1),
  name: v.string(),
  description: v.string(),
  cost: v.number(),
  style: v.picklist(["OPTION_1", "OPTION_2"]),
});
export type LineItemV1 = v.InferOutput<typeof lineItemV1Schema>;

export const lineItemSchema = v.variant("version", [lineItemV1Schema]);
export type LineItem = v.InferOutput<typeof lineItemSchema>;

export const invoiceSchema = v.object({
  ...tenantTableSchema.entries,
  lineItems: v.array(lineItemSchema),
  status: v.picklist(invoiceStatuses),
  chargedAt: v.optional(v.date()),
  orderId: nanoIdSchema,
});

export const createInvoiceMutationArgsSchema = v.object({
  ...v.omit(invoiceSchema, ["status", "chargedAt", "deletedAt"]).entries,
  status: v.literal("processing"),
  chargedAt: v.null(),
  deletedAt: v.null(),
});

export const estimateSchema = v.object({
  total: v.number(),
  description: v.optional(v.string()),
  items: v.array(lineItemSchema),
});
export type Estimate = v.InferOutput<typeof estimateSchema>;

export const estimateCostFunctionSchema = v.pipe(
  v.function(),
  v.args(v.tuple([orderAttributesSchema])),
  v.returns(estimateSchema),
);
export type EstimateCostFunction = v.InferOutput<
  typeof estimateCostFunctionSchema
>;
