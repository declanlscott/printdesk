import { Either, Schema, Struct } from "effect";

import { DataAccess } from "../data-access2";
import { SyncTable, TenantTable, View } from "../database2/shared";
import { Constants } from "../utils/constants";
import { IsoDate, IsoTimestamp, NanoId } from "../utils2/shared";

import type { ActiveOrdersView, OrdersTable } from "./sql";

export const OrderAttributesV1 = Schema.TaggedStruct("OrderAttributesV1", {
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
export const orders = SyncTable<OrdersTable>()(
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
    approvedAt: Schema.NullOr(Schema.DateTimeUtc),
  }),
  ["create", "read", "update", "delete"],
);

export const activeOrdersViewName = `active_${ordersTableName}`;
export const activeOrders = View<ActiveOrdersView>()(
  activeOrdersViewName,
  orders.Schema,
);

export const isOrderCustomer = new DataAccess.Policy({
  name: "isOrderCustomer",
  Args: orders.Schema.pick("id"),
});

export const isOrderManager = new DataAccess.Policy({
  name: "isOrderManager",
  Args: orders.Schema.pick("id"),
});

export const isOrderCustomerOrManager = new DataAccess.Policy({
  name: "isOrderCustomerOrManager",
  Args: orders.Schema.pick("id"),
});

export const hasActiveOrderBillingAccountManagerAuthorization =
  new DataAccess.Policy({
    name: "hasActiveOrderBillingAccountManagerAuthorization",
    Args: orders.Schema.pick("id"),
  });

export const canEditOrder = new DataAccess.Policy({
  name: "canEditOrder",
  Args: orders.Schema.pick("id"),
});

export const canApproveOrder = new DataAccess.Policy({
  name: "canApproveOrder",
  Args: orders.Schema.pick("id"),
});

export const canTransitionOrder = new DataAccess.Policy({
  name: "canTransitionOrder",
  Args: orders.Schema.pick("id"),
});

export const canDeleteOrder = new DataAccess.Policy({
  name: "canDeleteOrder",
  Args: orders.Schema.pick("id"),
});

export const createOrder = new DataAccess.Mutation({
  name: "createOrder",
  Args: orders.Schema.omit("approvedAt", "deletedAt", "tenantId"),
});

export const editOrder = new DataAccess.Mutation({
  name: "editOrder",
  Args: Schema.extend(
    orders.Schema.pick("id", "updatedAt"),
    orders.Schema.omit(
      ...Struct.keys(TenantTable.fields),
      "customerId",
      "managerId",
      "operatorId",
      "billingAccountId",
      "workflowStatus",
      "approvedAt",
    ).pipe(Schema.partial),
  ),
});

export const approveOrder = new DataAccess.Mutation({
  name: "approveOrder",
  Args: Schema.extend(
    orders.Schema.pick("id", "updatedAt", "workflowStatus"),
    Schema.Struct({
      approvedAt: Schema.DateTimeUtc,
    }),
  ),
});

export const transitionOrder = new DataAccess.Mutation({
  name: "transitionOrder",
  Args: orders.Schema.pick("id", "updatedAt", "workflowStatus"),
});

export const deleteOrder = new DataAccess.Mutation({
  name: "deleteOrder",
  Args: Schema.Struct({
    id: NanoId,
    deletedAt: Schema.DateTimeUtc,
  }),
});
