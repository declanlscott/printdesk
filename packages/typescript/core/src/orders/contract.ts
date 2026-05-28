import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { AttributesContract } from "../attributes/contract";
import { ColumnsContract } from "../columns/contract";
import { ProceduresContract } from "../procedures/contract";
import { TablesContract } from "../tables/contract";
import { EntityId, IsoDate, IsoTimestamp } from "../utils";
import { Constants } from "../utils/constants";

import type {
  ActiveCustomerPlacedOrdersView,
  ActiveManagerAuthorizedSharedAccountOrdersView,
  ActiveOrdersView,
  OrdersTable,
} from "./sql";

export namespace OrdersContract {
  export class AttributesV1 extends Schema.TaggedClass<AttributesV1>()("OrderAttributesV1", {
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
  }) {}
  export const Attributes = Schema.Union([AttributesV1]);

  class BaseModel extends Schema.Class<BaseModel>("BaseModel")({
    ...TablesContract.BaseSyncModel.fields,
    shortId: ColumnsContract.NullableShortId,
    customerId: EntityId,
    managerId: ColumnsContract.NullableEntityId,
    operatorId: ColumnsContract.NullableEntityId,
    productId: EntityId,
    sharedAccountId: EntityId.pipe(Schema.NullOr),
    deliveryOptionId: EntityId,
    attributes: Attributes,
    approvedAt: ColumnsContract.NullableTimestamp,
  }) {}

  export class RoomWorkflowStatusModel extends BaseModel.extend<RoomWorkflowStatusModel>(
    "RoomWorkflowStatus",
  )({ roomWorkflowStatusId: EntityId, sharedAccountWorkflowStatusId: Schema.Null }) {}

  export class SharedAccountWorkflowStatusModel extends BaseModel.extend<SharedAccountWorkflowStatusModel>(
    "SharedAccountWorkflowStatus",
  )({ roomWorkflowStatusId: Schema.Null, sharedAccountWorkflowStatusId: EntityId }) {}

  export class Table extends TablesContract.UnionTable<OrdersTable>("orders")(
    [RoomWorkflowStatusModel.fields, SharedAccountWorkflowStatusModel.fields],
    ["create", "read", "update", "delete"],
  ) {}

  export class ActiveRoomWorkflowStatusModel extends Schema.Class<ActiveRoomWorkflowStatusModel>(
    "ActiveRoomWorkflowStatus",
  )(
    Struct.evolve(RoomWorkflowStatusModel.fields, {
      deletedAt: (deletedAt) => deletedAt.schema.from.schema.members[0].members[1],
    }),
  ) {}

  export class ActiveSharedAccountWorkflowStatusModel extends Schema.Class<ActiveSharedAccountWorkflowStatusModel>(
    "ActiveSharedAccountWorkflowStatus",
  )(
    Struct.evolve(SharedAccountWorkflowStatusModel.fields, {
      deletedAt: (deletedAt) => deletedAt.schema.from.schema.members[0].members[1],
    }),
  ) {}

  export class ActiveView extends TablesContract.UnionView<ActiveOrdersView>(
    `active_${Table.name}`,
  )([ActiveSharedAccountWorkflowStatusModel.fields, ActiveRoomWorkflowStatusModel.fields]) {}

  export class ActiveCustomerPlacedView extends TablesContract.UnionVirtualView<ActiveCustomerPlacedOrdersView>()(
    `active_customer_placed_${Table.name}`,
    ActiveView.membersFields,
  ) {}

  export class ActiveManagerAuthorizedRoomWorkflowStatusModel extends ActiveRoomWorkflowStatusModel.extend<ActiveManagerAuthorizedRoomWorkflowStatusModel>(
    "ActiveManagerAuthorizedSharedAccountRoomWorkflowStatus",
  )({ authorizedManagerId: EntityId }) {}

  export class ActiveManagerAuthorizedSharedAccountWorkflowStatusModel extends ActiveSharedAccountWorkflowStatusModel.extend<ActiveManagerAuthorizedSharedAccountWorkflowStatusModel>(
    "ActiveManagerAuthorizedSharedAccountWorkflowStatus",
  )({ authorizedManagerId: EntityId }) {}

  export class ActiveManagerAuthorizedSharedAccountView extends TablesContract.UnionView<ActiveManagerAuthorizedSharedAccountOrdersView>(
    `active_manager_authorized_shared_account_${Table.name}`,
  )([
    ActiveManagerAuthorizedSharedAccountWorkflowStatusModel.fields,
    ActiveManagerAuthorizedRoomWorkflowStatusModel.fields,
  ]) {}

  export class Item extends Schema.Class<Item>("Item")({
    [Constants.DYNAMO_KEYS.PK]: AttributesContract.TenantRoomIdFromString,
    [Constants.DYNAMO_KEYS.SK]: AttributesContract.OrderShortIdFromString,
  }) {}

  const IdOnly = Schema.Struct(
    Struct.evolve(Struct.pick(BaseModel.fields, ["id"]), { id: (id) => id.from.schema.members[0] }),
  );

  export const isCustomer = new ProceduresContract.Procedure({
    name: "isOrderCustomer",
    Args: IdOnly.mapFields(
      Struct.assign({ customerId: EntityId.pipe(Schema.OptionFromUndefinedOr) }),
    ),
    Returns: Schema.Void,
  });

  export const isManager = new ProceduresContract.Procedure({
    name: "isOrderManager",
    Args: IdOnly.mapFields(
      Struct.assign({ managerId: EntityId.pipe(Schema.OptionFromUndefinedOr) }),
    ),
    Returns: Schema.Void,
  });

  export const isCustomerOrManager = new ProceduresContract.Procedure({
    name: "isOrderCustomerOrManager",
    Args: IdOnly.mapFields(Struct.assign({ userId: EntityId.pipe(Schema.OptionFromUndefinedOr) })),
    Returns: Schema.Void,
  });

  export const isManagerAuthorized = new ProceduresContract.Procedure({
    name: "isOrderManagerAuthorized",
    Args: IdOnly.mapFields(
      Struct.assign({ managerId: EntityId.pipe(Schema.OptionFromUndefinedOr) }),
    ),
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
    ...Table.dtoOmitKeys,
    "shortId",
    "managerId",
    "operatorId",
    "approvedAt",
    "deletedAt",
    "tenantId",
  ] as const;
  export const create = new ProceduresContract.Procedure({
    name: "createOrder",
    Args: Schema.Union([
      SharedAccountWorkflowStatusModel.mapFields(Struct.omit(omittedOnCreate)),
      RoomWorkflowStatusModel.mapFields(Struct.omit(omittedOnCreate)),
    ]),
    Returns: Table.Dto,
  });

  export const edit = new ProceduresContract.Procedure({
    name: "editOrder",
    Args: BaseModel.mapFields(Struct.omit([...Struct.keys(TablesContract.BaseSyncModel.fields)]))
      .mapFields(Struct.map(Schema.optional))
      .mapFields(
        Struct.assign(
          Struct.evolve(Struct.pick(BaseModel.fields, ["id", "updatedAt"]), {
            id: (id) => id.from.schema.members[0],
          }),
        ),
      ),
    Returns: Table.Dto,
  });

  export const approve = new ProceduresContract.Procedure({
    name: "approveOrder",
    Args: IdOnly.mapFields(
      Struct.assign(
        Struct.evolve(
          Struct.pick(RoomWorkflowStatusModel.fields, ["approvedAt", "roomWorkflowStatusId"]),
          { approvedAt: (approvedAt) => approvedAt.schema.from.schema.members[0].members[0] },
        ),
      ),
    ),
    Returns: Table.Dto,
  });

  export const transitionRoomWorkflowStatus = new ProceduresContract.Procedure({
    name: "transitionOrderRoomWorkflowStatus",
    Args: IdOnly.mapFields(
      Struct.assign(
        Struct.pick(RoomWorkflowStatusModel.fields, ["updatedAt", "roomWorkflowStatusId"]),
      ),
    ),
    Returns: Table.Dto,
  });

  export const transitionSharedAccountWorkflowStatus = new ProceduresContract.Procedure({
    name: "transitionOrderSharedAccountWorkflowStatus",
    Args: IdOnly.mapFields(
      Struct.assign(
        Struct.pick(SharedAccountWorkflowStatusModel.fields, [
          "updatedAt",
          "sharedAccountWorkflowStatusId",
        ]),
      ),
    ),
    Returns: Table.Dto,
  });

  export const delete_ = new ProceduresContract.Procedure({
    name: "deleteOrder",
    Args: IdOnly.mapFields(
      Struct.assign(
        Struct.evolve(Struct.pick(BaseModel.fields, ["deletedAt"]), {
          deletedAt: (deletedAt) => deletedAt.schema.from.schema.members[0].members[0],
        }),
      ),
    ),
    Returns: Table.Dto,
  });

  export const restore = new ProceduresContract.Procedure({
    name: "restoreOrder",
    Args: IdOnly,
    Returns: Table.Dto,
  });
}
