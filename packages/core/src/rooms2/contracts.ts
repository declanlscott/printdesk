import { Schema, Struct } from "effect";

import { DataAccessContract } from "../data-access2/contract";
import { TableContract } from "../database2/contract";
import { Constants } from "../utils/constants";
import { Cost, HexColor } from "../utils2";

import type {
  DeliveryOptionsSchema,
  RoomsSchema,
  WorkflowStatusesSchema,
} from "./schemas";

export namespace RoomsContract {
  export const statuses = ["draft", "published"] as const;
  export type Status = (typeof statuses)[number];

  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    ...TableContract.Tenant.fields,
    name: Schema.Trim.pipe(Schema.maxLength(Constants.VARCHAR_LENGTH)),
    status: Schema.Literal(...statuses),
    details: Schema.NullOr(Schema.String),
  }) {}
  export const DataTransferStruct = Schema.Struct(DataTransferObject.fields);

  export const tableName = "rooms";
  export const table = TableContract.Sync<RoomsSchema.Table>()(
    tableName,
    DataTransferObject,
    ["create", "read", "update", "delete"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView = TableContract.View<RoomsSchema.ActiveView>()(
    activeViewName,
    DataTransferObject,
  );

  export const activePublishedViewName = `active_published_${tableName}`;
  export const activePublishedView =
    TableContract.View<RoomsSchema.ActivePublishedView>()(
      activePublishedViewName,
      DataTransferObject,
    );

  export const create = new DataAccessContract.Function({
    name: "createRoom",
    Args: DataTransferStruct.omit("deletedAt", "tenantId"),
    Returns: DataTransferObject,
  });

  export const update = new DataAccessContract.Function({
    name: "updateRoom",
    Args: Schema.extend(
      DataTransferStruct.pick("id", "updatedAt"),
      DataTransferStruct.omit(...Struct.keys(TableContract.Tenant.fields)).pipe(
        Schema.partial,
      ),
    ),
    Returns: DataTransferObject,
  });

  export const delete_ = new DataAccessContract.Function({
    name: "deleteRoom",
    Args: Schema.Struct({
      id: TableContract.EntityId,
      deletedAt: Schema.DateTimeUtc,
    }),
    Returns: DataTransferStruct,
  });

  export const restore = new DataAccessContract.Function({
    name: "restoreRoom",
    Args: DataTransferStruct.pick("id"),
    Returns: DataTransferStruct,
  });
}

export namespace WorkflowsContract {
  export const statusTypes = [
    "Review",
    "New",
    "Pending",
    "InProgress",
    "Completed",
  ] as const;
  export type StatusType = (typeof statusTypes)[number];
  export type PostReviewStatusType = Exclude<StatusType, "Review">;

  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    ...TableContract.Tenant.fields,
    name: Schema.Trim.pipe(Schema.maxLength(Constants.VARCHAR_LENGTH)),
    type: Schema.Literal(...statusTypes),
    charging: Schema.Boolean,
    color: Schema.NullOr(HexColor),
    index: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    roomId: TableContract.EntityId,
  }) {}
  export const DataTransferStruct = Schema.Struct(DataTransferObject.fields);

  export const default_ = [
    { name: "New", type: "New", charging: false },
    { name: "Pending", type: "Pending", charging: false },
    { name: "In Progress", type: "InProgress", charging: false },
    { name: "Completed", type: "Completed", charging: true },
    { name: "Canceled", type: "Completed", charging: false },
  ] as const satisfies ReadonlyArray<
    Pick<DataTransferObject, "name" | "type" | "charging">
  >;

  export const tableName = "workflow_statuses";
  export const table = TableContract.Sync<WorkflowStatusesSchema.Table>()(
    tableName,
    DataTransferObject,
    ["create", "read"],
  );

  export const activePublishedRoomViewName = `active_published_room_${tableName}`;
  export const activePublishedRoomView =
    TableContract.View<WorkflowStatusesSchema.ActivePublishedRoomView>()(
      activePublishedRoomViewName,
      DataTransferObject,
    );

  export const Workflow = Schema.Array(
    Schema.Struct({
      ...DataTransferStruct.omit("index", "roomId", "tenantId", "type").fields,
      type: Schema.Literal(...statusTypes.filter((type) => type !== "Review")),
    }),
  ).pipe(
    Schema.filter(
      (workflow) =>
        Array.from(new Set(workflow.map((status) => status.id))).length ===
          workflow.length || "Workflow status names must be unique",
    ),
    Schema.filter(
      (workflow) =>
        workflow.length === 0 ||
        workflow.map((status) => status.type).filter((type) => type === "New")
          .length === 1 ||
        "Workflow must have exactly one status of type 'New'",
    ),
  );
  export type Workflow = typeof Workflow.Type;

  export const set = new DataAccessContract.Function({
    name: "setWorkflow",
    Args: Schema.Struct({
      workflow: Workflow,
      roomId: TableContract.EntityId,
    }),
    Returns: Workflow,
  });
}

export namespace DeliveryOptionsContract {
  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    ...TableContract.Tenant.fields,
    name: Schema.Trim.pipe(Schema.maxLength(Constants.VARCHAR_LENGTH)),
    description: Schema.Trim.pipe(Schema.maxLength(Constants.VARCHAR_LENGTH)),
    detailsLabel: Schema.NullOr(Schema.Trim),
    cost: Schema.NullOr(
      Schema.transform(Cost, Schema.String, {
        decode: String,
        encode: Number,
        strict: true,
      }),
    ),
    index: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    roomId: TableContract.EntityId,
  }) {}
  export const DataTransferStruct = Schema.Struct(DataTransferObject.fields);

  export const tableName = "delivery_options";
  export const table = TableContract.Sync<DeliveryOptionsSchema.Table>()(
    tableName,
    DataTransferObject,
    ["create", "read"],
  );

  export const activePublishedRoomViewName = `active_published_room_${tableName}`;
  export const activePublishedRoomView =
    TableContract.View<DeliveryOptionsSchema.ActivePublishedRoomView>()(
      activePublishedRoomViewName,
      DataTransferObject,
    );

  export const DeliveryOptions = Schema.Array(
    DataTransferStruct.omit("index", "roomId", "tenantId"),
  ).pipe(
    Schema.filter(
      (opts) =>
        Array.from(new Set(opts.map((o) => o.id))).length === opts.length ||
        "Delivery option names must be unique",
    ),
  );
  export type DeliveryOptions = typeof DeliveryOptions.Type;

  export const set = new DataAccessContract.Function({
    name: "setDeliveryOptions",
    Args: Schema.Struct({
      options: DeliveryOptions,
      roomId: TableContract.EntityId,
    }),
    Returns: DeliveryOptions,
  });
}
