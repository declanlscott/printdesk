import { Either, Schema, Struct } from "effect";

import { DataAccessContract } from "../data-access2/contract";
import { TableContract } from "../database2/contract";
import { Constants } from "../utils/constants";
import { IsoDate, IsoTimestamp } from "../utils2";

import type {
  ActiveManagedBillingAccountOrdersView,
  ActiveOrdersView,
  OrdersTable,
} from "./sql";

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
  export const table = TableContract.Sync<OrdersTable>()(
    tableName,
    Schema.Struct({
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
      attributes: Attributes,
      workflowStatus: Schema.Trim.pipe(
        Schema.maxLength(Constants.VARCHAR_LENGTH),
      ),
      deliverTo: Schema.Trim.pipe(Schema.maxLength(Constants.VARCHAR_LENGTH)),
      approvedAt: Schema.optionalWith(Schema.NullOr(Schema.DateTimeUtc), {
        default: () => null,
      }),
    }),
    ["create", "read", "update", "delete"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView = TableContract.View<ActiveOrdersView>()(
    activeViewName,
    table.Schema,
  );

  export const activeManagedBillingAccountViewName = `active_managed_billing_account_${tableName}`;
  export const activeManagedBillingAccountView =
    TableContract.View<ActiveManagedBillingAccountOrdersView>()(
      activeManagedBillingAccountViewName,
      Schema.extend(
        table.Schema,
        Schema.Struct({ authorizedManagerId: TableContract.EntityId }),
      ),
    );

  export const activePlacedViewName = `active_placed_${tableName}`;
  export const activePlacedView = TableContract.VirtualView<ActiveOrdersView>()(
    activePlacedViewName,
    table.Schema,
  );

  export const isCustomer = new DataAccessContract.Function({
    name: "isOrderCustomer",
    Args: table.Schema.pick("id"),
    Returns: Schema.Void,
  });

  export const isManager = new DataAccessContract.Function({
    name: "isOrderManager",
    Args: table.Schema.pick("id"),
    Returns: Schema.Void,
  });

  export const isCustomerOrManager = new DataAccessContract.Function({
    name: "isOrderCustomerOrManager",
    Args: table.Schema.pick("id"),
    Returns: Schema.Void,
  });

  export const hasActiveManagerAuthorization = new DataAccessContract.Function({
    name: "hasActiveOrderBillingAccountManagerAuthorization",
    Args: table.Schema.pick("id"),
    Returns: Schema.Void,
  });

  export const canEdit = new DataAccessContract.Function({
    name: "canEditOrder",
    Args: table.Schema.pick("id"),
    Returns: Schema.Void,
  });

  export const canApprove = new DataAccessContract.Function({
    name: "canApproveOrder",
    Args: table.Schema.pick("id"),
    Returns: Schema.Void,
  });

  export const canTransition = new DataAccessContract.Function({
    name: "canTransitionOrder",
    Args: table.Schema.pick("id"),
    Returns: Schema.Void,
  });

  export const canDelete = new DataAccessContract.Function({
    name: "canDeleteOrder",
    Args: table.Schema.pick("id"),
    Returns: Schema.Void,
  });

  export const create = new DataAccessContract.Function({
    name: "createOrder",
    Args: table.Schema.omit(
      "managerId",
      "operatorId",
      "approvedAt",
      "deletedAt",
      "tenantId",
    ),
    Returns: table.Schema,
  });

  export const edit = new DataAccessContract.Function({
    name: "editOrder",
    Args: Schema.extend(
      table.Schema.pick("id", "updatedAt"),
      table.Schema.omit(
        ...Struct.keys(TableContract.Tenant.fields),
        "customerId",
        "managerId",
        "operatorId",
        "billingAccountId",
        "workflowStatus",
        "approvedAt",
      ).pipe(Schema.partial),
    ),
    Returns: table.Schema,
  });

  export const approve = new DataAccessContract.Function({
    name: "approveOrder",
    Args: Schema.extend(
      table.Schema.pick("id", "updatedAt", "workflowStatus"),
      Schema.Struct({
        approvedAt: Schema.DateTimeUtc,
      }),
    ),
    Returns: table.Schema,
  });

  export const transition = new DataAccessContract.Function({
    name: "transitionOrder",
    Args: table.Schema.pick("id", "updatedAt", "workflowStatus"),
    Returns: table.Schema,
  });

  export const delete_ = new DataAccessContract.Function({
    name: "deleteOrder",
    Args: Schema.Struct({
      id: TableContract.EntityId,
      deletedAt: Schema.DateTimeUtc,
    }),
    Returns: table.Schema,
  });
}
