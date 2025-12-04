import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { ColumnsContract } from "../columns2/contract";
import { ProceduresContract } from "../procedures/contract";
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
  export const table =
    new (TablesContract.makeClass<RoomWorkflowsSchema.Table>())(
      tableName,
      DataTransferObject,
      ["read"],
    );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    new (TablesContract.makeViewClass<RoomWorkflowsSchema.ActiveView>())(
      activeViewName,
      DataTransferObject,
    );

  export const activePublishedRoomViewName = `active_published_${tableName}`;
  export const activePublishedRoomView =
    new (TablesContract.makeViewClass<RoomWorkflowsSchema.ActivePublishedRoomView>())(
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
    new (TablesContract.makeClass<SharedAccountWorkflowsSchema.Table>())(
      tableName,
      DataTransferObject,
      ["read"],
    );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    new (TablesContract.makeViewClass<SharedAccountWorkflowsSchema.ActiveView>())(
      activeViewName,
      DataTransferObject,
    );

  export const activeCustomerAuthorizedViewName = `active_customer_authorized_${tableName}`;
  export const activeCustomerAuthorizedView =
    new (TablesContract.makeViewClass<SharedAccountWorkflowsSchema.ActiveCustomerAuthorizedView>())(
      activeCustomerAuthorizedViewName,
      Schema.extend(
        DataTransferObject,
        Schema.Struct({ authorizedCustomerId: ColumnsContract.EntityId }),
      ),
    );

  export const activeManagerAuthorizedViewName = `active_manager_authorized_${tableName}`;
  export const activeManagerAuthorizedView =
    new (TablesContract.makeViewClass<SharedAccountWorkflowsSchema.ActiveManagerAuthorizedView>())(
      activeManagerAuthorizedViewName,
      Schema.extend(
        DataTransferObject,
        Schema.Struct({ authorizedManagerId: ColumnsContract.EntityId }),
      ),
    );

  export const isCustomerAuthorized = new ProceduresContract.Procedure({
    name: "isCustomerAuthorizedSharedAccountWorkflow",
    Args: Schema.Struct({ id: ColumnsContract.EntityId }),
    Returns: Schema.Void,
  });

  export const isManagerAuthorized = new ProceduresContract.Procedure({
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
  export const table =
    new (TablesContract.makeClass<WorkflowStatusesSchema.Table>())(
      tableName,
      DataTransferObject,
      ["create", "read", "update", "delete"],
    );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    new (TablesContract.makeViewClass<WorkflowStatusesSchema.ActiveView>())(
      activeViewName,
      DataTransferObject,
    );

  export const activePublishedRoomViewName = `active_published_room_${tableName}`;
  export const activePublishedRoomView =
    new (TablesContract.makeViewClass<WorkflowStatusesSchema.ActivePublishedRoomView>())(
      activePublishedRoomViewName,
      RoomWorkflowDto,
    );

  export const activeCustomerAuthorizedSharedAccountViewName = `active_customer_authorized_shared_account_${tableName}`;
  export const activeCustomerAuthorizedSharedAccountView =
    new (TablesContract.makeViewClass<WorkflowStatusesSchema.ActiveCustomerAuthorizedSharedAccountView>())(
      activeCustomerAuthorizedSharedAccountViewName,
      Schema.extend(
        SharedAccountWorkflowDto,
        Schema.Struct({ authorizedCustomerId: ColumnsContract.EntityId }),
      ),
    );

  export const activeManagerAuthorizedSharedAccountViewName = `active_manager_authorized_shared_account_${tableName}`;
  export const activeManagerAuthorizedSharedAccountView =
    new (TablesContract.makeViewClass<WorkflowStatusesSchema.ActiveManagerAuthorizedSharedAccountView>())(
      activeManagerAuthorizedSharedAccountViewName,
      Schema.extend(
        SharedAccountWorkflowDto,
        Schema.Struct({ authorizedManagerId: ColumnsContract.EntityId }),
      ),
    );

  export const canEdit = new ProceduresContract.Procedure({
    name: "canEditWorkflowStatus",
    Args: BaseDto.pick("id"),
    Returns: Schema.Void,
  });

  export const canDelete = new ProceduresContract.Procedure({
    name: "canDeleteWorkflowStatus",
    Args: BaseDto.pick("id"),
    Returns: Schema.Void,
  });

  export const append = new ProceduresContract.Procedure({
    name: "appendWorkflowStatus",
    Args: Schema.Union(
      SharedAccountWorkflowDto.omit("index", "deletedAt", "tenantId"),
      RoomWorkflowDto.omit("index", "deletedAt", "tenantId"),
    ),
    Returns: DataTransferObject,
  });

  export const edit = new ProceduresContract.Procedure({
    name: "editWorkflowStatus",
    Args: Schema.extend(
      BaseDto.pick("id", "updatedAt"),
      BaseDto.omit(...Struct.keys(ColumnsContract.Tenant.fields), "index").pipe(
        Schema.partial,
      ),
    ),
    Returns: DataTransferObject,
  });

  export const reorder = new ProceduresContract.Procedure({
    name: "reorderWorkflowStatus",
    Args: BaseDto.pick("id", "index", "updatedAt"),
    Returns: DataTransferObject.pipe(Schema.Array),
  });

  export const delete_ = new ProceduresContract.Procedure({
    name: "deleteWorkflowStatus",
    Args: Schema.Struct({
      id: ColumnsContract.EntityId,
      deletedAt: Schema.DateTimeUtc,
    }),
    Returns: DataTransferObject,
  });
}
