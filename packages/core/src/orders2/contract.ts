import { Either, Schema, Struct } from "effect";

import { DataAccess } from "../data-access2";
import { DatabaseContract } from "../database2/contract";
import { Constants } from "../utils/constants";
import { IsoDate, IsoTimestamp, NanoId } from "../utils2/shared";

import type { ActiveOrdersView, OrdersTable } from "./sql";

export namespace OrdersContract {
  export const AttributesV1 = Schema.TaggedStruct("OrderAttributesV1", {
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
  export const Attributes = Schema.Union(AttributesV1);

  export const tableName = "orders";
  export const table = DatabaseContract.SyncTable<OrdersTable>()(
    tableName,
    Schema.Struct({
      ...DatabaseContract.TenantTable.fields,
      customerId: NanoId,
      managerId: Schema.NullOr(NanoId),
      operatorId: Schema.NullOr(NanoId),
      productId: NanoId,
      billingAccountId: NanoId,
      attributes: Attributes,
      workflowStatus: Schema.Trim.pipe(
        Schema.maxLength(Constants.VARCHAR_LENGTH),
      ),
      deliverTo: Schema.Trim.pipe(Schema.maxLength(Constants.VARCHAR_LENGTH)),
      approvedAt: Schema.NullOr(Schema.DateTimeUtc),
    }),
    ["create", "read", "update", "delete"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView = DatabaseContract.View<ActiveOrdersView>()(
    activeViewName,
    table.Schema,
  );

  export const isCustomer = new DataAccess.PolicySignature({
    name: "isOrderCustomer",
    Args: table.Schema.pick("id"),
  });

  export const isManager = new DataAccess.PolicySignature({
    name: "isOrderManager",
    Args: table.Schema.pick("id"),
  });

  export const isCustomerOrManager = new DataAccess.PolicySignature({
    name: "isOrderCustomerOrManager",
    Args: table.Schema.pick("id"),
  });

  export const hasActiveManagerAuthorization = new DataAccess.PolicySignature({
    name: "hasActiveOrderBillingAccountManagerAuthorization",
    Args: table.Schema.pick("id"),
  });

  export const canEdit = new DataAccess.PolicySignature({
    name: "canEditOrder",
    Args: table.Schema.pick("id"),
  });

  export const canApprove = new DataAccess.PolicySignature({
    name: "canApproveOrder",
    Args: table.Schema.pick("id"),
  });

  export const canTransition = new DataAccess.PolicySignature({
    name: "canTransitionOrder",
    Args: table.Schema.pick("id"),
  });

  export const canDelete = new DataAccess.PolicySignature({
    name: "canDeleteOrder",
    Args: table.Schema.pick("id"),
  });

  export const create = new DataAccess.MutationSignature({
    name: "createOrder",
    Args: table.Schema.omit("approvedAt", "deletedAt", "tenantId"),
  });

  export const edit = new DataAccess.MutationSignature({
    name: "editOrder",
    Args: Schema.extend(
      table.Schema.pick("id", "updatedAt"),
      table.Schema.omit(
        ...Struct.keys(DatabaseContract.TenantTable.fields),
        "customerId",
        "managerId",
        "operatorId",
        "billingAccountId",
        "workflowStatus",
        "approvedAt",
      ).pipe(Schema.partial),
    ),
  });

  export const approve = new DataAccess.MutationSignature({
    name: "approveOrder",
    Args: Schema.extend(
      table.Schema.pick("id", "updatedAt", "workflowStatus"),
      Schema.Struct({
        approvedAt: Schema.DateTimeUtc,
      }),
    ),
  });

  export const transition = new DataAccess.MutationSignature({
    name: "transitionOrder",
    Args: table.Schema.pick("id", "updatedAt", "workflowStatus"),
  });

  export const delete_ = new DataAccess.MutationSignature({
    name: "deleteOrder",
    Args: Schema.Struct({
      id: NanoId,
      deletedAt: Schema.DateTimeUtc,
    }),
  });
}
