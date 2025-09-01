import { Schema, Struct } from "effect";

import { DataAccessContract } from "../data-access2/contract";
import { TableContract } from "../database2/contract";
import { Constants } from "../utils/constants";
import { HexColor } from "../utils2";

import type {
  BillingAccountWorkflowsSchema,
  RoomWorkflowsSchema,
  WorkflowStatusesSchema,
} from "./schemas";

export namespace BillingAccountWorkflowsContract {
  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    ...TableContract.Tenant.fields,
    billingAccountId: TableContract.EntityId,
  }) {}
  export const DataTransferStruct = Schema.Struct(DataTransferObject.fields);

  export const tableName = "billing_account_workflows";
  export const table =
    TableContract.Sync<BillingAccountWorkflowsSchema.Table>()(
      tableName,
      DataTransferObject,
      ["read"],
    );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    TableContract.View<BillingAccountWorkflowsSchema.ActiveView>()(
      activeViewName,
      DataTransferObject,
    );

  export const activeCustomerAuthorizedViewName = `active_customer_authorized_${tableName}`;
  export const activeCustomerAuthorizedView =
    TableContract.View<BillingAccountWorkflowsSchema.ActiveCustomerAuthorizedView>()(
      activeCustomerAuthorizedViewName,
      Schema.extend(
        DataTransferObject,
        Schema.Struct({ authorizedCustomerId: TableContract.EntityId }),
      ),
    );

  export const activeManagerAuthorizedViewName = `active_manager_authorized_${tableName}`;
  export const activeManagerAuthorizedView =
    TableContract.View<BillingAccountWorkflowsSchema.ActiveManagerAuthorizedView>()(
      activeManagerAuthorizedViewName,
      Schema.extend(
        DataTransferObject,
        Schema.Struct({ authorizedManagerId: TableContract.EntityId }),
      ),
    );

  export const doesExist = new DataAccessContract.Function({
    name: "doesBillingAccountWorkflowExist",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });
}

export namespace RoomWorkflowsContract {
  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    ...TableContract.Tenant.fields,
    roomId: TableContract.EntityId,
  }) {}
  export const DataTransferStruct = Schema.Struct(DataTransferObject.fields);

  export const tableName = "room_workflows";
  export const table = TableContract.Sync<RoomWorkflowsSchema.Table>()(
    tableName,
    DataTransferObject,
    ["read"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    TableContract.View<RoomWorkflowsSchema.ActiveView>()(
      activeViewName,
      DataTransferObject,
    );

  export const activePublishedRoomViewName = `active_published_${tableName}`;
  export const activePublishedRoomView =
    TableContract.View<RoomWorkflowsSchema.ActivePublishedRoomView>()(
      activePublishedRoomViewName,
      DataTransferObject,
    );

  export const doesExist = new DataAccessContract.Function({
    name: "doesRoomWorkflowExist",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });
}

export namespace WorkflowStatusesContract {
  export const types = ["New", "Pending", "InProgress", "Completed"] as const;
  export type Type = (typeof types)[number];

  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    ...TableContract.Tenant.fields,
    name: Schema.Trim.pipe(Schema.maxLength(Constants.VARCHAR_LENGTH)),
    type: Schema.Literal(...types),
    charging: Schema.Boolean,
    color: HexColor.pipe(Schema.NullOr),
    index: Schema.NonNegativeInt,
    workflowId: TableContract.EntityId,
  }) {}
  export const DataTransferStruct = Schema.Struct(DataTransferObject.fields);

  export const tableName = "workflow_statuses";
  export const table = TableContract.Sync<WorkflowStatusesSchema.Table>()(
    tableName,
    DataTransferObject,
    ["read"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    TableContract.View<WorkflowStatusesSchema.ActiveView>()(
      activeViewName,
      DataTransferObject,
    );

  export const activeCustomerAuthorizedViewName = `active_customer_authorized_${tableName}`;
  export const activeCustomerAuthorizedView =
    TableContract.View<WorkflowStatusesSchema.ActiveCustomerAuthorizedView>()(
      activeCustomerAuthorizedViewName,
      Schema.Struct({
        ...DataTransferObject.fields,
        authorizedCustomerId: TableContract.EntityId,
      }),
    );

  export const activeManagerAuthorizedViewName = `active_manager_authorized_${tableName}`;
  export const activeManagerAuthorizedView =
    TableContract.View<WorkflowStatusesSchema.ActiveManagerAuthorizedView>()(
      activeManagerAuthorizedViewName,
      Schema.Struct({
        ...DataTransferObject.fields,
        authorizedManagerId: TableContract.EntityId,
      }),
    );

  export const activePublishedRoomViewName = `active_published_room_${tableName}`;
  export const activePublishedRoomView =
    TableContract.View<WorkflowStatusesSchema.ActivePublishedRoomView>()(
      activePublishedRoomViewName,
      DataTransferObject,
    );

  export const append = new DataAccessContract.Function({
    name: "appendWorkflowStatus",
    Args: DataTransferStruct.omit("index", "deletedAt", "tenantId"),
    Returns: DataTransferObject,
  });

  export const edit = new DataAccessContract.Function({
    name: "editWorkflowStatus",
    Args: Schema.extend(
      DataTransferStruct.pick("id", "workflowId", "updatedAt"),
      DataTransferStruct.omit(
        ...Struct.keys(TableContract.Tenant.fields),
        "index",
      ).pipe(Schema.partial),
    ),
    Returns: DataTransferObject,
  });

  export const reorder = new DataAccessContract.Function({
    name: "reorderWorkflowStatuses",
    Args: Schema.extend(
      DataTransferStruct.pick("workflowId", "updatedAt"),
      Schema.Struct({
        oldIndex: Schema.NonNegativeInt,
        newIndex: Schema.NonNegativeInt,
        workflowId: TableContract.EntityId,
      }),
    ),
    Returns: DataTransferObject.pipe(Schema.Array),
  });

  export class InvalidReorderDeltaError extends Schema.TaggedError<InvalidReorderDeltaError>(
    "InvalidReorderDeltaError",
  )("InvalidReorderDeltaError", {
    sliceLength: Schema.NonNegativeInt,
    absoluteDelta: Schema.NonNegativeInt,
  }) {}

  export const delete_ = new DataAccessContract.Function({
    name: "deleteWorkflowStatus",
    Args: Schema.Struct({
      id: TableContract.EntityId,
      deletedAt: Schema.DateTimeUtc,
    }),
    Returns: DataTransferObject,
  });
}
