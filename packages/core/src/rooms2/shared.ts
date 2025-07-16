export const roomsTableName = "rooms";

export const roomStatuses = ["draft", "published"] as const;
export type RoomStatus = (typeof roomStatuses)[number];

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

export const deliveryOptionsTableName = "delivery_options";
