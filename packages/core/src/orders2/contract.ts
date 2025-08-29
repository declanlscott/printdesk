import { Either, Schema, Struct } from "effect";

import { DataAccessContract } from "../data-access2/contract";
import { TableContract } from "../database2/contract";
import { IsoDate, IsoTimestamp } from "../utils2";

import type { OrdersSchema } from "./schema";

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

  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    ...TableContract.Tenant.fields,
    customerId: TableContract.EntityId,
    managerId: Schema.optionalWith(Schema.NullOr(TableContract.EntityId), {
      default: () => null,
    }),
    operatorId: Schema.optionalWith(Schema.NullOr(TableContract.EntityId), {
      default: () => null,
    }),
    productId: TableContract.EntityId,
    billingAccountId: TableContract.EntityId,
    workflowStatusId: TableContract.EntityId,
    deliveryOptionId: TableContract.EntityId,
    attributes: Attributes,
    approvedAt: Schema.optionalWith(Schema.NullOr(Schema.DateTimeUtc), {
      default: () => null,
    }),
  }) {}
  export const DataTransferStruct = Schema.Struct(DataTransferObject.fields);

  export const tableName = "orders";
  export const table = TableContract.Sync<OrdersSchema.Table>()(
    tableName,
    DataTransferObject,
    ["create", "read", "update", "delete"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView = TableContract.View<OrdersSchema.ActiveView>()(
    activeViewName,
    DataTransferObject,
  );

  export const activeManagedBillingAccountViewName = `active_managed_billing_account_${tableName}`;
  export const activeManagedBillingAccountView =
    TableContract.View<OrdersSchema.ActiveManagedBillingAccountView>()(
      activeManagedBillingAccountViewName,
      Schema.Struct({
        ...DataTransferObject.fields,
        authorizedManagerId: TableContract.EntityId,
      }),
    );

  export const activePlacedViewName = `active_placed_${tableName}`;
  export const activePlacedView =
    TableContract.VirtualView<OrdersSchema.ActiveView>()(
      activePlacedViewName,
      DataTransferObject,
    );

  export const isCustomer = new DataAccessContract.Function({
    name: "isOrderCustomer",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const isManager = new DataAccessContract.Function({
    name: "isOrderManager",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const isCustomerOrManager = new DataAccessContract.Function({
    name: "isOrderCustomerOrManager",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const hasActiveManagerAuthorization = new DataAccessContract.Function({
    name: "hasActiveOrderBillingAccountManagerAuthorization",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const canEdit = new DataAccessContract.Function({
    name: "canEditOrder",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const canApprove = new DataAccessContract.Function({
    name: "canApproveOrder",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const canTransition = new DataAccessContract.Function({
    name: "canTransitionOrder",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const canDelete = new DataAccessContract.Function({
    name: "canDeleteOrder",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const create = new DataAccessContract.Function({
    name: "createOrder",
    Args: DataTransferStruct.omit(
      "managerId",
      "operatorId",
      "approvedAt",
      "deletedAt",
      "tenantId",
    ),
    Returns: DataTransferObject,
  });

  export const edit = new DataAccessContract.Function({
    name: "editOrder",
    Args: Schema.extend(
      DataTransferStruct.pick("id", "updatedAt"),
      DataTransferStruct.omit(
        ...Struct.keys(TableContract.Tenant.fields),
        "customerId",
        "managerId",
        "operatorId",
        "billingAccountId",
        "workflowStatusId",
        "approvedAt",
      ).pipe(Schema.partial),
    ),
    Returns: DataTransferObject,
  });

  export const approve = new DataAccessContract.Function({
    name: "approveOrder",
    Args: Schema.Struct({
      ...DataTransferStruct.pick("id", "updatedAt", "workflowStatusId").fields,
      approvedAt: Schema.DateTimeUtc,
    }),
    Returns: DataTransferObject,
  });

  export const transition = new DataAccessContract.Function({
    name: "transitionOrder",
    Args: DataTransferStruct.pick("id", "updatedAt", "workflowStatusId"),
    Returns: DataTransferObject,
  });

  export const delete_ = new DataAccessContract.Function({
    name: "deleteOrder",
    Args: Schema.Struct({
      id: TableContract.EntityId,
      deletedAt: Schema.DateTimeUtc,
    }),
    Returns: DataTransferObject,
  });
}
