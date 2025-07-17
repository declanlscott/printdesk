import { Schema } from "effect";

import { TenantTable } from "../database2/constructors";
import { Constants } from "../utils/constants";
import { Cost, HexColor, NanoId } from "../utils2/shared";

import type { WorkflowStatus as WorkflowStatusColumns } from "./sql";

export const roomsTableName = "rooms";
export const roomStatuses = ["draft", "published"] as const;
export type RoomStatus = (typeof roomStatuses)[number];
export const Room = Schema.Struct({
  ...TenantTable.fields,
  name: Schema.Trim.pipe(Schema.maxLength(Constants.VARCHAR_LENGTH)),
  status: Schema.Literal(...roomStatuses),
  details: Schema.NullOr(Schema.String),
});
export const CreateRoom = Schema.Struct({
  ...Room.omit("deletedAt").fields,
  deletedAt: Schema.Null,
});
export const UpdateRoom = Schema.extend(
  Schema.Struct({
    id: NanoId,
    updatedAt: Schema.Date,
  }),
  Room.pick("name", "status", "details").pipe(Schema.partial),
);
export const DeleteRoom = Schema.Struct({
  id: NanoId,
  deletedAt: Schema.Date,
});
export const RestoreRoom = Schema.Struct({
  id: NanoId,
});

export const workflowStatusesTableName = "workflow_statuses";
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
] satisfies Array<Omit<WorkflowStatusColumns, "index" | "roomId" | "tenantId">>;
export const WorkflowStatus = Schema.Struct({
  id: Schema.Trim.pipe(Schema.maxLength(Constants.VARCHAR_LENGTH)),
  type: Schema.Literal(...workflowStatusTypes),
  charging: Schema.Boolean,
  color: Schema.NullOr(HexColor),
  index: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  roomId: NanoId,
  tenantId: NanoId,
});
export const Workflow = Schema.Array(
  Schema.Struct({
    ...WorkflowStatus.omit("index", "roomId", "tenantId", "type").fields,
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
export const SetWorkflow = Schema.Struct({
  workflow: Workflow,
  roomId: NanoId,
});

export const deliveryOptionsTableName = "delivery_options";
export const DeliveryOption = Schema.Struct({
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
});
export const DeliveryOptions = Schema.Array(
  DeliveryOption.omit("index", "roomId", "tenantId"),
).pipe(
  Schema.filter(
    (opts) =>
      Array.from(new Set(opts.map((o) => o.id))).length === opts.length ||
      "Delivery option names must be unique",
  ),
);
export const SetDeliveryOptions = Schema.Struct({
  options: DeliveryOptions,
  roomId: NanoId,
});
