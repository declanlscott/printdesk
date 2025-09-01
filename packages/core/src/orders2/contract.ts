import { Either, Equal, Predicate, Schema } from "effect";

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
    due: IsoDate.pipe(Schema.optional),

    // Copies
    copies: Schema.Struct({
      quantity: Schema.Number,
    }).pipe(Schema.optional),

    // Color mode
    color: Schema.Struct({
      enabled: Schema.Boolean.annotations({
        decodingFallback: () => Either.right(false),
      }),
    }).pipe(Schema.optional),

    // Pages
    pages: Schema.Struct({
      grayscalePages: Schema.Int,
      colorPages: Schema.Int,
    }).pipe(Schema.optional),

    // Single or double sided
    printOnBothSides: Schema.Struct({
      enabled: Schema.Boolean,
    }).pipe(Schema.optional),

    // Paper stock
    paperStock: Schema.Struct({
      cost: Schema.Number,
      size: Schema.String,
      color: Schema.String,
      type: Schema.String,
    }).pipe(Schema.optional),

    // Collating
    collating: Schema.Struct({
      name: Schema.String,
    }).pipe(Schema.optional),

    // Front Cover
    frontCover: Schema.Struct({
      cost: Schema.Number,
      name: Schema.String,
    }).pipe(Schema.optional),

    // Binding
    binding: Schema.Struct({
      cost: Schema.Number,
      name: Schema.String,

      // Binding option sub-attributes
      attributes: Schema.Struct({
        name: Schema.String,

        // Binding option sub-attribute options
        option: Schema.Struct({
          cost: Schema.Number,
          name: Schema.String,
        }),
      }).pipe(Schema.Array),
    }).pipe(Schema.optional),

    // Cutting
    cutting: Schema.Struct({
      cost: Schema.Number,
      name: Schema.String,
    }).pipe(Schema.optional),

    // Hole punching
    holePunching: Schema.Struct({
      cost: Schema.Number,
      name: Schema.String,
    }).pipe(Schema.optional),

    // Folding
    folding: Schema.Struct({
      cost: Schema.Number,
      name: Schema.String,
    }).pipe(Schema.optional),

    // Packaging
    packaging: Schema.Struct({
      cost: Schema.Number,
      name: Schema.String,
      itemsPerSet: Schema.Number,
    }).pipe(Schema.optional),

    // Laminating
    laminating: Schema.Struct({
      cost: Schema.Number,
      name: Schema.String,
    }).pipe(Schema.optional),

    // Proof Required
    proofRequired: Schema.Struct({
      cost: Schema.Number,
      name: Schema.String,
    }).pipe(Schema.optional),

    // Material
    material: Schema.Struct({
      cost: Schema.Number,
      name: Schema.String,

      // Material color options
      color: Schema.Struct({
        cost: Schema.Number,
        name: Schema.String,
        value: Schema.String,
      }),
    }).pipe(Schema.optional),

    // Custom text fields
    custom: Schema.Struct({
      fields: Schema.Struct({
        name: Schema.String,
        value: Schema.String,

        // Custom drop-down list options
        option: Schema.Struct({
          cost: Schema.Number,
          name: Schema.String,
        }),
      }).pipe(Schema.Array),
    }).pipe(Schema.optional),
  });
  export const Attributes = Schema.Union(AttributesV1);

  const dtoFilter = (
    personalAccountId: TableContract.EntityId | null,
    sharedAccountId: TableContract.EntityId | null,
    sharedAccountWorkflowStatusId: TableContract.EntityId | null,
    roomWorkflowStatusId: TableContract.EntityId | null,
  ) => {
    if (
      !Equal.equals(
        Predicate.isNull(personalAccountId),
        Predicate.isNull(sharedAccountId),
      )
    )
      return "Order account must be either personal or shared.";

    if (
      !Equal.equals(
        Predicate.isNull(sharedAccountWorkflowStatusId),
        Predicate.isNull(roomWorkflowStatusId),
      )
    )
      return "Order workflow status must be either shared or room.";

    return true;
  };

  export const DataTransferObject = Schema.Struct({
    ...TableContract.Tenant.fields,
    customerId: TableContract.EntityId,
    managerId: TableContract.EntityId.pipe(
      Schema.NullOr,
      Schema.optionalWith({ default: () => null }),
    ),
    operatorId: TableContract.EntityId.pipe(
      Schema.NullOr,
      Schema.optionalWith({ default: () => null }),
    ),
    productId: TableContract.EntityId,
    personalAccountId: TableContract.EntityId.pipe(Schema.NullOr),
    sharedAccountId: TableContract.EntityId.pipe(Schema.NullOr),
    sharedAccountWorkflowStatusId: TableContract.EntityId.pipe(Schema.NullOr),
    roomWorkflowStatusId: TableContract.EntityId.pipe(Schema.NullOr),
    deliveryOptionId: TableContract.EntityId,
    attributes: Attributes,
    approvedAt: Schema.DateTimeUtc.pipe(
      Schema.NullOr,
      Schema.optionalWith({ default: () => null }),
    ),
  }).pipe(
    Schema.filter((dto) =>
      dtoFilter(
        dto.personalAccountId,
        dto.sharedAccountId,
        dto.sharedAccountWorkflowStatusId,
        dto.roomWorkflowStatusId,
      ),
    ),
  );
  export type DataTransferObject = typeof DataTransferObject.Type;

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
      Schema.extend(
        DataTransferObject,
        Schema.Struct({ authorizedManagerId: TableContract.EntityId }),
      ),
    );

  export const activePlacedViewName = `active_placed_${tableName}`;
  export const activePlacedView =
    TableContract.VirtualView<OrdersSchema.ActiveView>()(
      activePlacedViewName,
      DataTransferObject,
    );

  export const isCustomer = new DataAccessContract.Function({
    name: "isOrderCustomer",
    Args: DataTransferObject.from.pick("id"),
    Returns: Schema.Void,
  });

  export const isManager = new DataAccessContract.Function({
    name: "isOrderManager",
    Args: DataTransferObject.from.pick("id"),
    Returns: Schema.Void,
  });

  export const isCustomerOrManager = new DataAccessContract.Function({
    name: "isOrderCustomerOrManager",
    Args: DataTransferObject.from.pick("id"),
    Returns: Schema.Void,
  });

  export const hasActiveManagerAuthorization = new DataAccessContract.Function({
    name: "hasActiveOrderBillingAccountManagerAuthorization",
    Args: DataTransferObject.from.pick("id"),
    Returns: Schema.Void,
  });

  export const canEdit = new DataAccessContract.Function({
    name: "canEditOrder",
    Args: DataTransferObject.from.pick("id"),
    Returns: Schema.Void,
  });

  export const canApprove = new DataAccessContract.Function({
    name: "canApproveOrder",
    Args: DataTransferObject.from.pick("id"),
    Returns: Schema.Void,
  });

  export const canTransition = new DataAccessContract.Function({
    name: "canTransitionOrder",
    Args: DataTransferObject.from.pick("id"),
    Returns: Schema.Void,
  });

  export const canDelete = new DataAccessContract.Function({
    name: "canDeleteOrder",
    Args: DataTransferObject.from.pick("id"),
    Returns: Schema.Void,
  });

  export const create = new DataAccessContract.Function({
    name: "createOrder",
    Args: DataTransferObject.from
      .omit("managerId", "operatorId", "approvedAt", "deletedAt", "tenantId")
      .pipe(
        Schema.filter((dto) =>
          dtoFilter(
            dto.personalAccountId,
            dto.sharedAccountId,
            dto.sharedAccountWorkflowStatusId,
            dto.roomWorkflowStatusId,
          ),
        ),
      ),
    Returns: DataTransferObject,
  });

  export const edit = new DataAccessContract.Function({
    name: "editOrder",
    Args: Schema.extend(
      DataTransferObject.from.pick("id", "updatedAt"),
      Schema.Struct({
        productId: TableContract.EntityId,
        deliveryOptionId: TableContract.EntityId,
        attributes: Attributes,
      }).pipe(Schema.partial),
    ),
    Returns: DataTransferObject,
  });

  export const approve = new DataAccessContract.Function({
    name: "approveOrder",
    Args: Schema.Struct({
      id: TableContract.EntityId,
      roomWorkflowStatusId: TableContract.EntityId,
      approvedAt: Schema.DateTimeUtc,
    }),
    Returns: DataTransferObject,
  });

  export const transitionSharedAccountWorkflowStatus =
    new DataAccessContract.Function({
      name: "transitionOrderSharedAccountWorkflowStatus",
      Args: Schema.Struct({
        id: TableContract.EntityId,
        updatedAt: Schema.DateTimeUtc,
        sharedAccountWorkflowStatusId: TableContract.EntityId,
      }),
      Returns: DataTransferObject,
    });

  export const transitionRoomWorkflowStatus = new DataAccessContract.Function({
    name: "transitionOrderRoomWorkflowStatus",
    Args: Schema.Struct({
      id: TableContract.EntityId,
      updatedAt: Schema.DateTimeUtc,
      roomWorkflowStatusId: TableContract.EntityId,
    }),
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
