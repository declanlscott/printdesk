import { Schema, Struct } from "effect";

import { SyncTable, TenantTable, View } from "../database2/shared";
import { SyncMutation } from "../sync2/shared";
import { Constants } from "../utils/constants";
import { Cost, HexColor, NanoId } from "../utils2/shared";

import type {
  ActivePublishedRoomDeliveryOptionsView,
  ActivePublishedRoomsView,
  ActivePublishedRoomWorkflowStatusesView,
  ActiveRoomsView,
  DeliveryOptionsTable,
  RoomsTable,
  WorkflowStatus,
  WorkflowStatusesTable,
} from "./sql";

export const roomStatuses = ["draft", "published"] as const;
export type RoomStatus = (typeof roomStatuses)[number];
export const roomsTableName = "rooms";
export const roomsTable = SyncTable<RoomsTable>()(
  roomsTableName,
  Schema.Struct({
    ...TenantTable.fields,
    name: Schema.Trim.pipe(Schema.maxLength(Constants.VARCHAR_LENGTH)),
    status: Schema.Literal(...roomStatuses),
    details: Schema.NullOr(Schema.String),
  }),
  ["create", "read", "update", "delete"],
);
export const activeRoomsViewName = `active_${roomsTableName}`;
export const activeRoomsView = View<ActiveRoomsView>()(
  activeRoomsViewName,
  roomsTable.Schema,
);
export const activePublishedRoomsViewName = `active_published_${roomsTableName}`;
export const activePublishedRoomsView = View<ActivePublishedRoomsView>()(
  activePublishedRoomsViewName,
  roomsTable.Schema,
);
export const createRoom = SyncMutation(
  "createRoom",
  roomsTable.Schema.omit("deletedAt", "tenantId"),
);
export const updateRoom = SyncMutation(
  "updateRoom",
  Schema.extend(
    roomsTable.Schema.pick("id", "updatedAt"),
    roomsTable.Schema.omit(...Struct.keys(TenantTable.fields)).pipe(
      Schema.partial,
    ),
  ),
);
export const deleteRoom = SyncMutation(
  "deleteRoom",
  Schema.Struct({
    id: NanoId,
    deletedAt: Schema.DateTimeUtc,
  }),
);
export const restoreRoom = SyncMutation(
  "restoreRoom",
  roomsTable.Schema.pick("id"),
);

export const workflowStatusTypes = [
  "Review",
  "New",
  "Pending",
  "InProgress",
  "Completed",
] as const;
export type WorkflowStatusType = (typeof workflowStatusTypes)[number];
export type PostReviewWorkflowStatusType = Exclude<
  WorkflowStatusType,
  "Review"
>;
export const defaultWorkflow = [
  {
    id: "New",
    type: "New",
    charging: false,
    color: null,
  },
  {
    id: "Pending",
    type: "Pending",
    charging: false,
    color: null,
  },
  {
    id: "In Progress",
    type: "InProgress",
    charging: false,
    color: null,
  },
  {
    id: "Completed",
    type: "Completed",
    charging: true,
    color: null,
  },
  {
    id: "Canceled",
    type: "Completed",
    charging: false,
    color: null,
  },
] satisfies Array<Omit<WorkflowStatus, "index" | "roomId" | "tenantId">>;
export const workflowStatusesTableName = "workflow_statuses";
export const workflowStatusesTable = SyncTable<WorkflowStatusesTable>()(
  workflowStatusesTableName,
  Schema.Struct({
    id: Schema.Trim.pipe(Schema.maxLength(Constants.VARCHAR_LENGTH)),
    type: Schema.Literal(...workflowStatusTypes),
    charging: Schema.Boolean,
    color: Schema.NullOr(HexColor),
    index: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    roomId: NanoId,
    tenantId: NanoId,
  }),
  ["create", "read"],
);
export const activePublishedRoomWorkflowStatusesViewName = `active_published_room_${workflowStatusesTableName}`;
export const activePublishedRoomWorkflowStatusesView =
  View<ActivePublishedRoomWorkflowStatusesView>()(
    activePublishedRoomWorkflowStatusesViewName,
    workflowStatusesTable.Schema,
  );
export const Workflow = Schema.Array(
  Schema.Struct({
    ...workflowStatusesTable.Schema.omit("index", "roomId", "tenantId", "type")
      .fields,
    type: Schema.Literal(
      ...workflowStatusTypes.filter((type) => type !== "Review"),
    ),
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
export const setWorkflow = SyncMutation(
  "setWorkflow",
  Schema.Struct({
    workflow: Workflow,
    roomId: NanoId,
  }),
);

export const deliveryOptionsTableName = "delivery_options";
export const deliveryOptionsTable = SyncTable<DeliveryOptionsTable>()(
  deliveryOptionsTableName,
  Schema.Struct({
    id: Schema.Trim.pipe(Schema.maxLength(Constants.VARCHAR_LENGTH)),
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
    roomId: NanoId,
    tenantId: NanoId,
  }),
  ["create", "read"],
);
export const activePublishedRoomDeliveryOptionsViewName = `active_published_room_${deliveryOptionsTableName}`;
export const activePublishedRoomDeliveryOptionsView =
  View<ActivePublishedRoomDeliveryOptionsView>()(
    activePublishedRoomDeliveryOptionsViewName,
    deliveryOptionsTable.Schema,
  );
export const DeliveryOptions = Schema.Array(
  deliveryOptionsTable.Schema.omit("index", "roomId", "tenantId"),
).pipe(
  Schema.filter(
    (opts) =>
      Array.from(new Set(opts.map((o) => o.id))).length === opts.length ||
      "Delivery option names must be unique",
  ),
);
export const setDeliveryOptions = SyncMutation(
  "setDeliveryOptions",
  Schema.Struct({
    options: DeliveryOptions,
    roomId: NanoId,
  }),
);
