import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { ColumnsContract } from "../columns/contract";
import { ProceduresContract } from "../procedures/contract";
import { TablesContract } from "../tables/contract";
import { IsoDate, IsoTimestamp } from "../utils";
import { Constants } from "../utils/constants";

import type { OrdersSchema } from "./schema";

export namespace OrdersContract {
  export class AttributesV1 extends Schema.TaggedClass<AttributesV1>()(
    "OrderAttributesV1",
    {
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
        enabled: Schema.Boolean,
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
    },
  ) {}
  export const Attributes = Schema.Union(AttributesV1);

  class BaseDto extends Schema.Class<BaseDto>("BaseDto")({
    ...ColumnsContract.BaseEntity.fields,
    shortId: ColumnsContract.NullableShortId,
    customerId: ColumnsContract.EntityId,
    managerId: ColumnsContract.NullableEntityId,
    operatorId: ColumnsContract.NullableEntityId,
    productId: ColumnsContract.EntityId,
    sharedAccountId: ColumnsContract.EntityId.pipe(Schema.NullOr),
    deliveryOptionId: ColumnsContract.EntityId,
    attributes: Attributes,
    approvedAt: ColumnsContract.NullableTimestamp,
  }) {}

  export class SharedAccountWorkflowStatusDto extends Schema.Class<SharedAccountWorkflowStatusDto>(
    "SharedAccountWorkflowStatus",
  )({
    ...BaseDto.fields,
    sharedAccountWorkflowStatusId: ColumnsContract.EntityId,
    roomWorkflowStatusId: Schema.Null,
  }) {}

  export class RoomWorkflowStatusDto extends Schema.Class<RoomWorkflowStatusDto>(
    "RoomWorkflowStatus",
  )({
    ...BaseDto.fields,
    sharedAccountWorkflowStatusId: Schema.Null,
    roomWorkflowStatusId: ColumnsContract.EntityId,
  }) {}

  export class Table extends TablesContract.Table<OrdersSchema.Table>("orders")(
    Schema.Union(SharedAccountWorkflowStatusDto, RoomWorkflowStatusDto),
    ["create", "read", "update", "delete"],
  ) {}

  export class ActiveView extends TablesContract.View<OrdersSchema.ActiveView>(
    "active_orders",
  )(
    Schema.Union(
      Schema.Struct(
        Struct.evolve(SharedAccountWorkflowStatusDto.fields, {
          deletedAt: (deletedAt) => deletedAt.from.members[1],
        }),
      ),
      Schema.Struct(
        Struct.evolve(RoomWorkflowStatusDto.fields, {
          deletedAt: (deletedAt) => deletedAt.from.members[1],
        }),
      ),
    ),
  ) {}

  export class ActiveCustomerPlacedView extends TablesContract.VirtualView<OrdersSchema.ActiveCustomerPlacedView>()(
    `active_customer_placed_${Table.name}`,
    ActiveView.DataTransferObject,
  ) {}

  export class ActiveManagerAuthorizedSharedAccountView extends TablesContract.View<OrdersSchema.ActiveManagerAuthorizedSharedAccountView>(
    "active_manager_authorized_shared_account_orders",
  )(
    ActiveView.DataTransferObject.pipe(
      Schema.extend(
        Schema.Struct({ authorizedManagerId: ColumnsContract.EntityId }),
      ),
    ),
  ) {}

  export class Item extends Schema.Class<Item>("Item")({
    [Constants.DDB_INDEXES.PK]: ColumnsContract.TenantIdRoomIdKeyFromString,
    [Constants.DDB_INDEXES.SK]: ColumnsContract.OrderShortIdKeyFromString,
  }) {}

  const IdOnly = Schema.Struct(
    Struct.evolve(Struct.pick(BaseDto.fields, "id"), {
      id: (id) => id.from,
    }),
  );

  export const isCustomer = new ProceduresContract.Procedure({
    name: "isOrderCustomer",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  export const isManager = new ProceduresContract.Procedure({
    name: "isOrderManager",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  export const isCustomerOrManager = new ProceduresContract.Procedure({
    name: "isOrderCustomerOrManager",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  export const isManagerAuthorized = new ProceduresContract.Procedure({
    name: "isOrderManagerAuthorized",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  export const canEdit = new ProceduresContract.Procedure({
    name: "canEditOrder",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  export const canApprove = new ProceduresContract.Procedure({
    name: "canApproveOrder",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  export const canTransition = new ProceduresContract.Procedure({
    name: "canTransitionOrder",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  export const canDelete = new ProceduresContract.Procedure({
    name: "canDeleteOrder",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  export const canRestore = new ProceduresContract.Procedure({
    name: "canRestoreOrder",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  const omittedOnCreate = [
    "shortId",
    "managerId",
    "operatorId",
    "approvedAt",
    "deletedAt",
    "tenantId",
  ] as const;
  export const create = new ProceduresContract.Procedure({
    name: "createOrder",
    Args: Schema.Union(
      SharedAccountWorkflowStatusDto.pipe(Schema.omit(...omittedOnCreate)),
      RoomWorkflowStatusDto.pipe(Schema.omit(...omittedOnCreate)),
    ),
    Returns: Table.DataTransferObject,
  });

  export const edit = new ProceduresContract.Procedure({
    name: "editOrder",
    Args: BaseDto.pipe(
      Schema.omit(
        ...Struct.keys(ColumnsContract.BaseEntity.fields),
        "shortId",
        "managerId",
        "operatorId",
        "approvedAt",
      ),
      Schema.partial,
      Schema.extend(
        Schema.Struct(
          Struct.evolve(Struct.pick(BaseDto.fields, "id", "updatedAt"), {
            id: (id) => id.from,
          }),
        ),
      ),
    ),
    Returns: Table.DataTransferObject,
  });

  export const approve = new ProceduresContract.Procedure({
    name: "approveOrder",
    Args: Schema.Struct(
      Struct.evolve(
        Struct.pick(
          RoomWorkflowStatusDto.fields,
          "id",
          "approvedAt",
          "roomWorkflowStatusId",
        ),
        {
          id: (id) => id.from,
          approvedAt: (approvedAt) => approvedAt.from.members[0],
        },
      ),
    ),
    Returns: Table.DataTransferObject,
  });

  export const transitionRoomWorkflowStatus = new ProceduresContract.Procedure({
    name: "transitionOrderRoomWorkflowStatus",
    Args: Schema.Struct(
      Struct.evolve(
        Struct.pick(
          RoomWorkflowStatusDto.fields,
          "id",
          "updatedAt",
          "roomWorkflowStatusId",
        ),
        { id: (id) => id.from },
      ),
    ),
    Returns: Table.DataTransferObject,
  });

  export const transitionSharedAccountWorkflowStatus =
    new ProceduresContract.Procedure({
      name: "transitionOrderSharedAccountWorkflowStatus",
      Args: Schema.Struct(
        Struct.evolve(
          Struct.pick(
            SharedAccountWorkflowStatusDto.fields,
            "id",
            "updatedAt",
            "sharedAccountWorkflowStatusId",
          ),
          { id: (id) => id.from },
        ),
      ),
      Returns: Table.DataTransferObject,
    });

  export const delete_ = new ProceduresContract.Procedure({
    name: "deleteOrder",
    Args: Schema.Struct(
      Struct.evolve(Struct.pick(BaseDto.fields, "id", "deletedAt"), {
        id: (id) => id.from,
        deletedAt: (deletedAt) => deletedAt.from.members[0],
      }),
    ),
    Returns: Table.DataTransferObject,
  });

  export const restore = new ProceduresContract.Procedure({
    name: "restoreOrder",
    Args: IdOnly,
    Returns: Table.DataTransferObject,
  });
}
