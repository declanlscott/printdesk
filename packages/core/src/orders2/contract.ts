import * as Either from "effect/Either";
import * as Schema from "effect/Schema";

import { ColumnsContract } from "../columns2/contract";
import { ProceduresContract } from "../procedures/contract";
import { TablesContract } from "../tables2/contract";
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

  const BaseDto = Schema.Struct({
    ...ColumnsContract.Tenant.fields,
    customerId: ColumnsContract.EntityId,
    managerId: ColumnsContract.EntityId.pipe(
      Schema.NullOr,
      Schema.optionalWith({ default: () => null }),
    ),
    operatorId: ColumnsContract.EntityId.pipe(
      Schema.NullOr,
      Schema.optionalWith({ default: () => null }),
    ),
    productId: ColumnsContract.EntityId,
    sharedAccountId: ColumnsContract.EntityId.pipe(Schema.NullOr),
    deliveryOptionId: ColumnsContract.EntityId,
    attributes: Attributes,
    approvedAt: Schema.DateTimeUtc.pipe(
      Schema.NullOr,
      Schema.optionalWith({ default: () => null }),
    ),
  });

  export const SharedAccountWorkflowStatusDto = Schema.Struct({
    ...BaseDto.fields,
    sharedAccountWorkflowStatusId: ColumnsContract.EntityId,
    roomWorkflowStatusId: Schema.Null,
  });

  export const RoomWorkflowStatusDto = Schema.Struct({
    ...BaseDto.fields,
    sharedAccountWorkflowStatusId: Schema.Null,
    roomWorkflowStatusId: ColumnsContract.EntityId,
  });

  export const DataTransferObject = Schema.Union(
    SharedAccountWorkflowStatusDto,
    RoomWorkflowStatusDto,
  );
  export type DataTransferObject = typeof DataTransferObject.Type;

  export const tableName = "orders";
  export const table = TablesContract.makeTable<OrdersSchema.Table>()(
    tableName,
    DataTransferObject,
    ["create", "read", "update", "delete"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView = TablesContract.makeView<OrdersSchema.ActiveView>()(
    activeViewName,
    DataTransferObject,
  );

  export const activeCustomerPlacedViewName = `active_customer_placed_${tableName}`;
  export const activeCustomerPlacedView =
    TablesContract.makeVirtualView<OrdersSchema.ActiveCustomerPlacedView>()(
      activeCustomerPlacedViewName,
      DataTransferObject,
    );

  export const activeManagerAuthorizedSharedAccountViewName = `active_manager_authorized_shared_account_${tableName}`;
  export const activeManagerAuthorizedSharedAccountView =
    TablesContract.makeVirtualView<OrdersSchema.ActiveManagerAuthorizedSharedAccountView>()(
      activeManagerAuthorizedSharedAccountViewName,
      Schema.extend(
        DataTransferObject,
        Schema.Struct({ authorizedManagerId: ColumnsContract.EntityId }),
      ),
    );

  export const isCustomer = new ProceduresContract.Procedure({
    name: "isOrderCustomer",
    Args: BaseDto.pick("id"),
    Returns: Schema.Void,
  });

  export const isManager = new ProceduresContract.Procedure({
    name: "isOrderManager",
    Args: BaseDto.pick("id"),
    Returns: Schema.Void,
  });

  export const isCustomerOrManager = new ProceduresContract.Procedure({
    name: "isOrderCustomerOrManager",
    Args: BaseDto.pick("id"),
    Returns: Schema.Void,
  });

  export const isManagerAuthorized = new ProceduresContract.Procedure({
    name: "isOrderManagerAuthorized",
    Args: BaseDto.pick("id"),
    Returns: Schema.Void,
  });

  export const canEdit = new ProceduresContract.Procedure({
    name: "canEditOrder",
    Args: BaseDto.pick("id"),
    Returns: Schema.Void,
  });

  export const canApprove = new ProceduresContract.Procedure({
    name: "canApproveOrder",
    Args: BaseDto.pick("id"),
    Returns: Schema.Void,
  });

  export const canTransition = new ProceduresContract.Procedure({
    name: "canTransitionOrder",
    Args: BaseDto.pick("id"),
    Returns: Schema.Void,
  });

  export const canDelete = new ProceduresContract.Procedure({
    name: "canDeleteOrder",
    Args: BaseDto.pick("id"),
    Returns: Schema.Void,
  });

  export const canRestore = new ProceduresContract.Procedure({
    name: "canRestoreOrder",
    Args: BaseDto.pick("id"),
    Returns: Schema.Void,
  });

  const omittedOnCreate = [
    "managerId",
    "operatorId",
    "approvedAt",
    "deletedAt",
    "tenantId",
  ] as const;
  export const create = new ProceduresContract.Procedure({
    name: "createOrder",
    Args: Schema.Union(
      SharedAccountWorkflowStatusDto.omit(...omittedOnCreate),
      RoomWorkflowStatusDto.omit(...omittedOnCreate),
    ),
    Returns: DataTransferObject,
  });

  export const edit = new ProceduresContract.Procedure({
    name: "editOrder",
    Args: Schema.extend(
      BaseDto.pick("id", "updatedAt"),
      BaseDto.pick(
        "productId",
        "sharedAccountId",
        "deliveryOptionId",
        "attributes",
      ).pipe(Schema.partial),
    ),
    Returns: DataTransferObject,
  });

  export const approve = new ProceduresContract.Procedure({
    name: "approveOrder",
    Args: Schema.Struct({
      id: ColumnsContract.EntityId,
      roomWorkflowStatusId: ColumnsContract.EntityId,
      approvedAt: Schema.DateTimeUtc,
    }),
    Returns: DataTransferObject,
  });

  export const transitionRoomWorkflowStatus = new ProceduresContract.Procedure({
    name: "transitionOrderRoomWorkflowStatus",
    Args: RoomWorkflowStatusDto.pick("id", "updatedAt", "roomWorkflowStatusId"),
    Returns: DataTransferObject,
  });

  export const transitionSharedAccountWorkflowStatus =
    new ProceduresContract.Procedure({
      name: "transitionOrderSharedAccountWorkflowStatus",
      Args: SharedAccountWorkflowStatusDto.pick(
        "id",
        "updatedAt",
        "sharedAccountWorkflowStatusId",
      ),
      Returns: DataTransferObject,
    });

  export const delete_ = new ProceduresContract.Procedure({
    name: "deleteOrder",
    Args: Schema.Struct({
      id: ColumnsContract.EntityId,
      deletedAt: Schema.DateTimeUtc,
    }),
    Returns: DataTransferObject,
  });

  export const restore = new ProceduresContract.Procedure({
    name: "restoreOrder",
    Args: BaseDto.pick("id"),
    Returns: DataTransferObject,
  });
}
