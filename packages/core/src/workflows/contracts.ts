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
  export class Table extends TablesContract.Table<RoomWorkflowsSchema.Table>(
    "room_workflows",
  )(
    class Dto extends ColumnsContract.BaseEntity.extend<Dto>("RoomWorkflow")({
      roomId: ColumnsContract.EntityId,
    }) {},
    ["read"],
  ) {}

  export class ActiveView extends TablesContract.View<RoomWorkflowsSchema.ActiveView>(
    "active_room_workflows",
  )(
    class Dto extends Schema.Class<Dto>("ActiveRoomWorkflow")(
      Struct.evolve(Table.DataTransferObject.fields, {
        deletedAt: (deletedAt) => deletedAt.from.members[1],
      }),
    ) {},
  ) {}

  export class ActivePublishedRoomView extends TablesContract.View<RoomWorkflowsSchema.ActivePublishedRoomView>(
    "active_published_room_workflows",
  )(ActiveView.DataTransferObject) {}
}

export namespace SharedAccountWorkflowsContract {
  export class Table extends TablesContract.Table<SharedAccountWorkflowsSchema.Table>(
    "shared_account_workflows",
  )(
    class Dto extends ColumnsContract.BaseEntity.extend<Dto>(
      "SharedAccountWorkflow",
    )({ sharedAccountId: ColumnsContract.EntityId }) {},
    ["read"],
  ) {}

  export class ActiveView extends TablesContract.View<SharedAccountWorkflowsSchema.ActiveView>(
    "active_shared_account_workflows",
  )(
    class Dto extends Schema.Class<Dto>("ActiveSharedAccountWorkflow")(
      Struct.evolve(Table.DataTransferObject.fields, {
        deletedAt: (deletedAt) => deletedAt.from.members[1],
      }),
    ) {},
  ) {}

  export class ActiveCustomerAuthorizedView extends TablesContract.View<SharedAccountWorkflowsSchema.ActiveCustomerAuthorizedView>(
    "active_customer_authorized_shared_account_workflows",
  )(
    class Dto extends ActiveView.DataTransferObject.extend<Dto>(
      "ActiveCustomerAuthorizedSharedAccountWorkflow",
    )({ customerId: ColumnsContract.EntityId }) {},
  ) {}

  export class ActiveManagerAuthorizedView extends TablesContract.View<SharedAccountWorkflowsSchema.ActiveManagerAuthorizedView>(
    "active_manager_authorized_shared_account_workflows",
  )(
    class Dto extends ActiveView.DataTransferObject.extend<Dto>(
      "ActiveManagerAuthorizedSharedAccountWorkflow",
    )({ managerId: ColumnsContract.EntityId }) {},
  ) {}

  const IdOnly = Schema.Struct(
    Struct.evolve(Struct.pick(Table.DataTransferObject.fields, "id"), {
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
    ...ColumnsContract.BaseEntity.fields,
    name: Schema.Trim.pipe(Schema.maxLength(Constants.VARCHAR_LENGTH)),
    type: Schema.Literal(...types),
    charging: Schema.Boolean,
    color: HexColor.pipe(Schema.NullOr),
    index: Schema.NonNegativeInt,
  }) {}

  export class SharedAccountWorkflowDto extends Schema.Class<SharedAccountWorkflowDto>(
    "SharedAccountWorkflow",
  )({
    ...BaseDto.fields,
    sharedAccountWorkflowId: ColumnsContract.EntityId,
    roomWorkflowId: Schema.Null,
  }) {}

  export class RoomWorkflowDto extends Schema.Class<RoomWorkflowDto>(
    "RoomWorkflow",
  )({
    ...BaseDto.fields,
    sharedAccountWorkflowId: Schema.Null,
    roomWorkflowId: ColumnsContract.EntityId,
  }) {}

  export class Table extends TablesContract.Table<WorkflowStatusesSchema.Table>(
    "workflow_statuses",
  )(Schema.Union(SharedAccountWorkflowDto, RoomWorkflowDto), [
    "create",
    "read",
    "update",
    "delete",
  ]) {}

  export class ActiveView extends TablesContract.View<WorkflowStatusesSchema.ActiveView>(
    "active_workflow_statuses",
  )(
    Schema.Union(
      Schema.Struct(
        Struct.evolve(SharedAccountWorkflowDto.fields, {
          deletedAt: (deletedAt) => deletedAt.from.members[1],
        }),
      ),
      Schema.Struct(
        Struct.evolve(RoomWorkflowDto.fields, {
          deletedAt: (deletedAt) => deletedAt.from.members[1],
        }),
      ),
    ),
  ) {}

  export class ActivePublishedRoomView extends TablesContract.View<WorkflowStatusesSchema.ActivePublishedRoomView>(
    "active_published_room_workflow_statuses",
  )(
    class Dto extends RoomWorkflowDto.extend<Dto>(
      "ActivePublishedRoomWorkflowStatus",
    )(
      Struct.evolve(RoomWorkflowDto.fields, {
        deletedAt: (deletedAt) => deletedAt.from.members[1],
      }),
    ) {},
  ) {}

  export class ActiveCustomerAuthorizedSharedAccountView extends TablesContract.View<WorkflowStatusesSchema.ActiveCustomerAuthorizedSharedAccountView>(
    "active_customer_authorized_shared_account_workflow_statuses",
  )(
    class Dto extends SharedAccountWorkflowDto.extend<Dto>(
      "ActiveCustomerAuthorizedSharedAccountWorkflowStatus",
    )({
      ...Struct.evolve(SharedAccountWorkflowDto.fields, {
        deletedAt: (deletedAt) => deletedAt.from.members[1],
      }),
      customerId: ColumnsContract.EntityId,
    }) {},
  ) {}

  export class ActiveManagerAuthorizedSharedAccountView extends TablesContract.View<WorkflowStatusesSchema.ActiveManagerAuthorizedSharedAccountView>(
    "active_manager_authorized_shared_account_workflow_statuses",
  )(
    class Dto extends SharedAccountWorkflowDto.extend<Dto>(
      "ActiveManagerAuthorizedSharedAccountWorkflowStatus",
    )({
      ...Struct.evolve(SharedAccountWorkflowDto.fields, {
        deletedAt: (deletedAt) => deletedAt.from.members[1],
      }),
      managerId: ColumnsContract.EntityId,
    }) {},
  ) {}

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
    Returns: Table.DataTransferObject,
  });

  export const edit = new ProceduresContract.Procedure({
    name: "editWorkflowStatus",
    Args: BaseDto.pipe(
      Schema.omit(...Struct.keys(ColumnsContract.BaseEntity.fields), "index"),
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

  export const reorder = new ProceduresContract.Procedure({
    name: "reorderWorkflowStatus",
    Args: Schema.Struct(
      Struct.evolve(Struct.pick(BaseDto.fields, "id", "index", "updatedAt"), {
        id: (id) => id.from,
      }),
    ),
    Returns: Table.DataTransferObject.pipe(Schema.Array),
  });

  export const delete_ = new ProceduresContract.Procedure({
    name: "deleteWorkflowStatus",
    Args: Schema.Struct(
      Struct.evolve(Struct.pick(BaseDto.fields, "id", "deletedAt"), {
        id: (id) => id.from,
        deletedAt: (deletedAt) => deletedAt.from.members[0],
      }),
    ),
    Returns: Table.DataTransferObject,
  });
}
