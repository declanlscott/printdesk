import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { ColumnsContract } from "../columns/contract";
import { ProceduresContract } from "../procedures/contract";
import { TablesContract } from "../tables/contract";
import { HexColor } from "../utils";
import { Constants } from "../utils/constants";

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

  const IdOnly = Schema.Struct(
    Struct.evolve(Struct.pick(DataTransferObject.fields, "id"), {
      id: (id) => id.from,
    }),
  );

  export const isCustomerAuthorized = new ProceduresContract.Procedure({
    name: "isCustomerAuthorizedSharedAccountWorkflow",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  export const isManagerAuthorized = new ProceduresContract.Procedure({
    name: "isManagerAuthorizedSharedAccountWorkflow",
    Args: IdOnly,
    Returns: Schema.Void,
  });
}

export namespace WorkflowStatusesContract {
  export const types = ["New", "Pending", "InProgress", "Completed"] as const;
  export type Type = (typeof types)[number];

  class BaseDto extends Schema.Class<BaseDto>("BaseDto")({
    ...ColumnsContract.Tenant.fields,
    name: Schema.Trim.pipe(Schema.maxLength(Constants.VARCHAR_LENGTH)),
    type: Schema.Literal(...types),
    charging: Schema.Boolean,
    color: HexColor.pipe(Schema.NullOr),
    index: Schema.NonNegativeInt,
  }) {}

  export class SharedAccountWorkflowDto extends Schema.Class<SharedAccountWorkflowDto>(
    "SharedAccountWorkflowDto",
  )({
    ...BaseDto.fields,
    sharedAccountWorkflowId: ColumnsContract.EntityId,
    roomWorkflowId: Schema.Null,
  }) {}

  export class RoomWorkflowDto extends Schema.Class<RoomWorkflowDto>(
    "RoomWorkflowDto",
  )({
    ...BaseDto.fields,
    sharedAccountWorkflowId: Schema.Null,
    roomWorkflowId: ColumnsContract.EntityId,
  }) {}

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

  const IdOnly = Schema.Struct(
    Struct.evolve(Struct.pick(BaseDto.fields, "id"), {
      id: (id) => id.from,
    }),
  );

  export const canEdit = new ProceduresContract.Procedure({
    name: "canEditWorkflowStatus",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  export const canDelete = new ProceduresContract.Procedure({
    name: "canDeleteWorkflowStatus",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  const omittedOnAppend = ["index", "deletedAt", "tenantId"] as const;
  export const append = new ProceduresContract.Procedure({
    name: "appendWorkflowStatus",
    Args: Schema.Union(
      SharedAccountWorkflowDto.pipe(Schema.omit(...omittedOnAppend)),
      RoomWorkflowDto.pipe(Schema.omit(...omittedOnAppend)),
    ),
    Returns: DataTransferObject,
  });

  export const edit = new ProceduresContract.Procedure({
    name: "editWorkflowStatus",
    Args: BaseDto.pipe(
      Schema.omit(...Struct.keys(ColumnsContract.Tenant.fields), "index"),
      Schema.partial,
      Schema.extend(
        Schema.Struct(
          Struct.evolve(Struct.pick(BaseDto.fields, "id", "updatedAt"), {
            id: (id) => id.from,
          }),
        ),
      ),
    ),
    Returns: DataTransferObject,
  });

  export const reorder = new ProceduresContract.Procedure({
    name: "reorderWorkflowStatus",
    Args: Schema.Struct(
      Struct.evolve(Struct.pick(BaseDto.fields, "id", "index", "updatedAt"), {
        id: (id) => id.from,
      }),
    ),
    Returns: DataTransferObject.pipe(Schema.Array),
  });

  export const delete_ = new ProceduresContract.Procedure({
    name: "deleteWorkflowStatus",
    Args: Schema.Struct(
      Struct.evolve(Struct.pick(BaseDto.fields, "id", "deletedAt"), {
        id: (id) => id.from,
        deletedAt: (deletedAt) => deletedAt.from.members[0],
      }),
    ),
    Returns: DataTransferObject,
  });
}
