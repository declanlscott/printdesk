import { Schema, Struct } from "effect";

import { ColumnsContract } from "../columns2/contract";
import { DataAccessContract } from "../data-access2/contract";
import { TablesContract } from "../tables2/contract";
import { Constants } from "../utils/constants";
import { HexColor } from "../utils2";

import type {
  RoomWorkflowsSchema,
  SharedAccountWorkflowsSchema,
  WorkflowStatusesSchema,
} from "./schemas";

export namespace RoomWorkflowsContract {
  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    ...ColumnsContract.Tenant.fields,
    roomId: ColumnsContract.EntityId,
  }) {}
  export const DataTransferStruct = Schema.Struct(DataTransferObject.fields);

  export const tableName = "room_workflows";
  export const table = TablesContract.makeTable<RoomWorkflowsSchema.Table>()(
    tableName,
    DataTransferObject,
    ["read"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    TablesContract.makeView<RoomWorkflowsSchema.ActiveView>()(
      activeViewName,
      DataTransferObject,
    );

  export const activePublishedRoomViewName = `active_published_${tableName}`;
  export const activePublishedRoomView =
    TablesContract.makeView<RoomWorkflowsSchema.ActivePublishedRoomView>()(
      activePublishedRoomViewName,
      DataTransferObject,
    );
}

export namespace SharedAccountWorkflowsContract {
  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    ...ColumnsContract.Tenant.fields,
    sharedAccountId: ColumnsContract.EntityId,
  }) {}
  export const DataTransferStruct = Schema.Struct(DataTransferObject.fields);

  export const tableName = "shared_account_workflows";
  export const table =
    TablesContract.makeTable<SharedAccountWorkflowsSchema.Table>()(
      tableName,
      DataTransferObject,
      ["read"],
    );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    TablesContract.makeView<SharedAccountWorkflowsSchema.ActiveView>()(
      activeViewName,
      DataTransferObject,
    );

  export const activeCustomerAuthorizedViewName = `active_customer_authorized_${tableName}`;
  export const activeCustomerAuthorizedView =
    TablesContract.makeView<SharedAccountWorkflowsSchema.ActiveCustomerAuthorizedView>()(
      activeCustomerAuthorizedViewName,
      Schema.extend(
        DataTransferObject,
        Schema.Struct({ authorizedCustomerId: ColumnsContract.EntityId }),
      ),
    );

  export const activeManagerAuthorizedViewName = `active_manager_authorized_${tableName}`;
  export const activeManagerAuthorizedView =
    TablesContract.makeView<SharedAccountWorkflowsSchema.ActiveManagerAuthorizedView>()(
      activeManagerAuthorizedViewName,
      Schema.extend(
        DataTransferObject,
        Schema.Struct({ authorizedManagerId: ColumnsContract.EntityId }),
      ),
    );

  export const isCustomerAuthorized = new DataAccessContract.Procedure({
    name: "isCustomerAuthorizedSharedAccountWorkflow",
    Args: Schema.Struct({ id: ColumnsContract.EntityId }),
    Returns: Schema.Void,
  });

  export const isManagerAuthorized = new DataAccessContract.Procedure({
    name: "isManagerAuthorizedSharedAccountWorkflow",
    Args: Schema.Struct({ id: ColumnsContract.EntityId }),
    Returns: Schema.Void,
  });
}

export namespace WorkflowStatusesContract {
  export const types = ["New", "Pending", "InProgress", "Completed"] as const;
  export type Type = (typeof types)[number];

  const BaseDto = Schema.Struct({
    ...ColumnsContract.Tenant.fields,
    name: Schema.Trim.pipe(Schema.maxLength(Constants.VARCHAR_LENGTH)),
    type: Schema.Literal(...types),
    charging: Schema.Boolean,
    color: HexColor.pipe(Schema.NullOr),
    index: Schema.NonNegativeInt,
  });

  export const SharedAccountWorkflowDto = Schema.Struct({
    ...BaseDto.fields,
    sharedAccountWorkflowId: ColumnsContract.EntityId,
    roomWorkflowId: Schema.Null,
  });

  export const RoomWorkflowDto = Schema.Struct({
    ...BaseDto.fields,
    sharedAccountWorkflowId: Schema.Null,
    roomWorkflowId: ColumnsContract.EntityId,
  });

  export const DataTransferObject = Schema.Union(
    SharedAccountWorkflowDto,
    RoomWorkflowDto,
  );
  export type DataTransferObject = typeof DataTransferObject.Type;

  export const tableName = "workflow_statuses";
  export const table = TablesContract.makeTable<WorkflowStatusesSchema.Table>()(
    tableName,
    DataTransferObject,
    ["create", "read", "update", "delete"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    TablesContract.makeView<WorkflowStatusesSchema.ActiveView>()(
      activeViewName,
      DataTransferObject,
    );

  export const activePublishedRoomViewName = `active_published_room_${tableName}`;
  export const activePublishedRoomView =
    TablesContract.makeView<WorkflowStatusesSchema.ActivePublishedRoomView>()(
      activePublishedRoomViewName,
      RoomWorkflowDto,
    );

  export const activeCustomerAuthorizedSharedAccountViewName = `active_customer_authorized_shared_account_${tableName}`;
  export const activeCustomerAuthorizedSharedAccountView =
    TablesContract.makeView<WorkflowStatusesSchema.ActiveCustomerAuthorizedSharedAccountView>()(
      activeCustomerAuthorizedSharedAccountViewName,
      Schema.extend(
        SharedAccountWorkflowDto,
        Schema.Struct({ authorizedCustomerId: ColumnsContract.EntityId }),
      ),
    );

  export const activeManagerAuthorizedSharedAccountViewName = `active_manager_authorized_shared_account_${tableName}`;
  export const activeManagerAuthorizedSharedAccountView =
    TablesContract.makeView<WorkflowStatusesSchema.ActiveManagerAuthorizedSharedAccountView>()(
      activeManagerAuthorizedSharedAccountViewName,
      Schema.extend(
        SharedAccountWorkflowDto,
        Schema.Struct({ authorizedManagerId: ColumnsContract.EntityId }),
      ),
    );

  export const canEdit = new DataAccessContract.Procedure({
    name: "canEditWorkflowStatus",
    Args: BaseDto.pick("id"),
    Returns: Schema.Void,
  });

  export const canDelete = new DataAccessContract.Procedure({
    name: "canDeleteWorkflowStatus",
    Args: BaseDto.pick("id"),
    Returns: Schema.Void,
  });

  export const append = new DataAccessContract.Procedure({
    name: "appendWorkflowStatus",
    Args: Schema.Union(
      SharedAccountWorkflowDto.omit("index", "deletedAt", "tenantId"),
      RoomWorkflowDto.omit("index", "deletedAt", "tenantId"),
    ),
    Returns: DataTransferObject,
  });

  export const edit = new DataAccessContract.Procedure({
    name: "editWorkflowStatus",
    Args: Schema.extend(
      BaseDto.pick("id", "updatedAt"),
      BaseDto.omit(...Struct.keys(ColumnsContract.Tenant.fields), "index").pipe(
        Schema.partial,
      ),
    ),
    Returns: DataTransferObject,
  });

  export const reorder = new DataAccessContract.Procedure({
    name: "reorderWorkflowStatus",
    Args: BaseDto.pick("id", "index", "updatedAt"),
    Returns: DataTransferObject.pipe(Schema.Array),
  });

  export const delete_ = new DataAccessContract.Procedure({
    name: "deleteWorkflowStatus",
    Args: Schema.Struct({
      id: ColumnsContract.EntityId,
      deletedAt: Schema.DateTimeUtc,
    }),
    Returns: DataTransferObject,
  });
}
