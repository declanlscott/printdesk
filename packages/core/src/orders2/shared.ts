import { Either, Schema, Struct } from "effect";

import { SyncTable, TenantTable, View } from "../database2/shared";
import { Constants } from "../utils/constants";
import { IsoDate, IsoTimestamp, NanoId } from "../utils2/shared";

import type { ActiveOrdersView, OrdersTable } from "./sql";

export const OrderAttributesV1 = Schema.Struct({
  version: Schema.Literal(1).annotations({
    decodingFallback: () => Either.right(1 as const),
  }),

  // Product name
  productName: Schema.String,

  // Delivery options
  deliveryOption: Schema.Struct({
    cost: Schema.String,
    name: Schema.String,
    detailsLabel: Schema.String,
  }),

  // Order dates
  created: IsoTimestamp,
  due: Schema.optional(IsoDate),

  // Copies
  copies: Schema.optional(
    Schema.Struct({
      quantity: Schema.Number,
    }),
  ),

  // Color mode
  color: Schema.optional(
    Schema.Struct({
      enabled: Schema.Boolean.annotations({
        decodingFallback: () => Either.right(false),
      }),
    }),
  ),

  // Pages
  pages: Schema.optional(
    Schema.Struct({
      grayscalePages: Schema.Int,
      colorPages: Schema.Int,
    }),
  ),

  // Single or double sided
  printOnBothSides: Schema.optional(
    Schema.Struct({
      enabled: Schema.Boolean,
    }),
  ),

  // Paper stock
  paperStock: Schema.optional(
    Schema.Struct({
      cost: Schema.Number,
      size: Schema.String,
      color: Schema.String,
      type: Schema.String,
    }),
  ),

  // Collating
  collating: Schema.optional(
    Schema.Struct({
      name: Schema.String,
    }),
  ),

  // Front Cover
  frontCover: Schema.optional(
    Schema.Struct({
      cost: Schema.Number,
      name: Schema.String,
    }),
  ),

  // Binding
  binding: Schema.optional(
    Schema.Struct({
      cost: Schema.Number,
      name: Schema.String,

      // Binding option sub-attributes
      attributes: Schema.Array(
        Schema.Struct({
          name: Schema.String,

          // Binding option sub-attribute options
          option: Schema.Struct({
            cost: Schema.Number,
            name: Schema.String,
          }),
        }),
      ),
    }),
  ),

  // Cutting
  cutting: Schema.optional(
    Schema.Struct({
      cost: Schema.Number,
      name: Schema.String,
    }),
  ),

  // Hole punching
  holePunching: Schema.optional(
    Schema.Struct({
      cost: Schema.Number,
      name: Schema.String,
    }),
  ),

  // Folding
  folding: Schema.optional(
    Schema.Struct({
      cost: Schema.Number,
      name: Schema.String,
    }),
  ),

  // Packaging
  packaging: Schema.optional(
    Schema.Struct({
      cost: Schema.Number,
      name: Schema.String,
      itemsPerSet: Schema.Number,
    }),
  ),

  // Laminating
  laminating: Schema.optional(
    Schema.Struct({
      cost: Schema.Number,
      name: Schema.String,
    }),
  ),

  // Proof Required
  proofRequired: Schema.optional(
    Schema.Struct({
      cost: Schema.Number,
      name: Schema.String,
    }),
  ),

  // Material
  material: Schema.optional(
    Schema.Struct({
      cost: Schema.Number,
      name: Schema.String,

      // Material color options
      color: Schema.Struct({
        cost: Schema.Number,
        name: Schema.String,
        value: Schema.String,
      }),
    }),
  ),

  // Custom text fields
  custom: Schema.optional(
    Schema.Struct({
      fields: Schema.Array(
        Schema.Struct({
          name: Schema.String,
          value: Schema.String,

          // Custom drop-down list options
          option: Schema.Struct({
            cost: Schema.Number,
            name: Schema.String,
          }),
        }),
      ),
    }),
  ),
});
export const OrderAttributes = Schema.Union(OrderAttributesV1);

export const ordersTableName = "orders";
export const ordersTable = SyncTable<OrdersTable>()(
  ordersTableName,
  Schema.Struct({
    ...TenantTable.fields,
    customerId: NanoId,
    managerId: Schema.NullOr(NanoId),
    operatorId: Schema.NullOr(NanoId),
    productId: NanoId,
    billingAccountId: NanoId,
    attributes: OrderAttributes,
    workflowStatus: Schema.Trim.pipe(
      Schema.maxLength(Constants.VARCHAR_LENGTH),
    ),
    deliverTo: Schema.Trim.pipe(Schema.maxLength(Constants.VARCHAR_LENGTH)),
    approvedAt: Schema.NullOr(Schema.Date),
  }),
  ["create", "read", "update", "delete"],
);

export const activeOrdersViewName = `active_${ordersTableName}`;
export const activeOrdersView = View<ActiveOrdersView>()(
  activeOrdersViewName,
  ordersTable.Schema,
);

export const CreateOrder = ordersTable.Schema.omit("deletedAt", "tenantId");

export const UpdateOrder = Schema.extend(
  ordersTable.Schema.pick("id", "updatedAt"),
  ordersTable.Schema.omit(...Struct.keys(TenantTable.fields)).pipe(
    Schema.partial,
  ),
);

export const DeleteOrder = Schema.Struct({
  id: NanoId,
  deletedAt: Schema.Date,
});
