import * as R from "remeda";
import * as v from "valibot";

import { Constants } from "../utils/constants";
import {
  costSchema,
  isSingleton,
  isUniqueByKey,
  nanoIdSchema,
  tenantTableSchema,
} from "../utils/shared";

import type { WorkflowStatus } from "./sql";

export const roomsTableName = "rooms";

export const roomStatuses = ["draft", "published"] as const;
export type RoomStatus = (typeof roomStatuses)[number];

export const roomSchema = v.object({
  ...tenantTableSchema.entries,
  name: v.pipe(v.string(), v.maxLength(Constants.VARCHAR_LENGTH)),
  status: v.picklist(roomStatuses),
  details: v.nullable(v.string()),
});

export const createRoomMutationArgsSchema = v.object({
  ...v.omit(roomSchema, ["deletedAt"]).entries,
  deletedAt: v.null(),
});
export type CreateRoomMutationArgs = v.InferOutput<
  typeof createRoomMutationArgsSchema
>;

export const updateRoomMutationArgsSchema = v.object({
  id: nanoIdSchema,
  updatedAt: v.date(),
  ...v.partial(
    v.omit(roomSchema, [
      "id",
      "tenantId",
      "createdAt",
      "updatedAt",
      "deletedAt",
    ]),
  ).entries,
});
export type UpdateRoomMutationArgs = v.InferOutput<
  typeof updateRoomMutationArgsSchema
>;

export const deleteRoomMutationArgsSchema = v.object({
  id: nanoIdSchema,
  deletedAt: v.date(),
});
export type DeleteRoomMutationArgs = v.InferOutput<
  typeof deleteRoomMutationArgsSchema
>;

export const restoreRoomMutationArgsSchema = v.object({
  id: nanoIdSchema,
});
export type RestoreRoomMutationArgs = v.InferOutput<
  typeof restoreRoomMutationArgsSchema
>;

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
] satisfies Array<Omit<WorkflowStatus, "index" | "roomId" | "tenantId">>;

export const workflowStatusSchema = v.object({
  id: v.pipe(v.string(), v.trim(), v.maxLength(Constants.VARCHAR_LENGTH)),
  type: v.picklist(workflowStatusTypes),
  charging: v.boolean(),
  color: v.nullable(v.pipe(v.string(), v.hexColor())),
  index: v.pipe(v.number(), v.integer(), v.minValue(0)),
  roomId: nanoIdSchema,
  tenantId: nanoIdSchema,
});

export const workflowSchema = v.pipe(
  v.array(
    v.object({
      ...v.omit(workflowStatusSchema, ["index", "roomId", "tenantId", "type"])
        .entries,
      type: v.picklist(workflowStatusTypes.filter((type) => type !== "Review")),
    }),
  ),
  v.check(
    (input) => isUniqueByKey("id", input),
    "Workflow status names must be unique",
  ),
  v.check(
    (workflow) =>
      R.pipe(
        workflow,
        R.conditional(
          [R.isEmpty, () => true],
          R.conditional.defaultCase(() =>
            R.pipe(
              workflow,
              R.filter((status) => status.type === "New"),
              isSingleton,
            ),
          ),
        ),
      ),
    "Workflow must have exactly one status of type 'New'",
  ),
);
export type Workflow = v.InferOutput<typeof workflowSchema>;

export const setWorkflowMutationArgsSchema = v.object({
  workflow: workflowSchema,
  roomId: nanoIdSchema,
});

export const deliveryOptionsTableName = "delivery_options";

export const deliveryOptionSchema = v.object({
  id: v.pipe(v.string(), v.trim(), v.maxLength(Constants.VARCHAR_LENGTH)),
  description: v.pipe(
    v.string(),
    v.trim(),
    v.maxLength(Constants.VARCHAR_LENGTH),
  ),
  detailsLabel: v.nullable(v.pipe(v.string(), v.trim())),
  cost: v.nullable(v.pipe(costSchema, v.transform(String))),
  index: v.pipe(v.number(), v.integer(), v.minValue(0)),
  roomId: nanoIdSchema,
  tenantId: nanoIdSchema,
});

export const deliveryOptionsSchema = v.pipe(
  v.array(v.omit(deliveryOptionSchema, ["index", "roomId", "tenantId"])),
  v.check(
    (input) => isUniqueByKey("id", input),
    "Delivery option names must be unique",
  ),
);
export type DeliveryOptions = v.InferOutput<typeof deliveryOptionsSchema>;

export const setDeliveryOptionsMutationArgsSchema = v.object({
  options: deliveryOptionsSchema,
  roomId: nanoIdSchema,
});
