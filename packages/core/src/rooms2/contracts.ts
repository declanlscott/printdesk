import { Schema, Struct } from "effect";

import { DataAccess } from "../data-access2";
import { DatabaseContract } from "../database2/contract";
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

export namespace RoomsContract {
  export const statuses = ["draft", "published"] as const;
  export type Status = (typeof statuses)[number];

  export const tableName = "rooms";
  export const table = DatabaseContract.SyncTable<RoomsTable>()(
    tableName,
    Schema.Struct({
      ...DatabaseContract.TenantTable.fields,
      name: Schema.Trim.pipe(Schema.maxLength(Constants.VARCHAR_LENGTH)),
      status: Schema.Literal(...statuses),
      details: Schema.NullOr(Schema.String),
    }),
    ["create", "read", "update", "delete"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView = DatabaseContract.View<ActiveRoomsView>()(
    activeViewName,
    table.Schema,
  );

  export const activePublishedViewName = `active_published_${tableName}`;
  export const activePublishedView =
    DatabaseContract.View<ActivePublishedRoomsView>()(
      activePublishedViewName,
      table.Schema,
    );

  export const create = new DataAccess.MutationSignature({
    name: "createRoom",
    Args: table.Schema.omit("deletedAt", "tenantId"),
  });

  export const update = new DataAccess.MutationSignature({
    name: "updateRoom",
    Args: Schema.extend(
      table.Schema.pick("id", "updatedAt"),
      table.Schema.omit(
        ...Struct.keys(DatabaseContract.TenantTable.fields),
      ).pipe(Schema.partial),
    ),
  });

  export const delete_ = new DataAccess.MutationSignature({
    name: "deleteRoom",
    Args: Schema.Struct({
      id: NanoId,
      deletedAt: Schema.DateTimeUtc,
    }),
  });

  export const restore = new DataAccess.MutationSignature({
    name: "restoreRoom",
    Args: table.Schema.pick("id"),
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

  export const default_ = [
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

  export const tableName = "workflow_statuses";
  export const table = DatabaseContract.SyncTable<WorkflowStatusesTable>()(
    tableName,
    Schema.Struct({
      id: Schema.Trim.pipe(Schema.maxLength(Constants.VARCHAR_LENGTH)),
      type: Schema.Literal(...statusTypes),
      charging: Schema.Boolean,
      color: Schema.NullOr(HexColor),
      index: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
      roomId: NanoId,
      tenantId: NanoId,
    }),
    ["create", "read"],
  );

  export const activePublishedRoomViewName = `active_published_room_${tableName}`;
  export const activePublishedRoomView =
    DatabaseContract.View<ActivePublishedRoomWorkflowStatusesView>()(
      activePublishedRoomViewName,
      table.Schema,
    );

  export const Workflow = Schema.Array(
    Schema.Struct({
      ...table.Schema.omit("index", "roomId", "tenantId", "type").fields,
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

  export const set = new DataAccess.MutationSignature({
    name: "setWorkflow",
    Args: Schema.Struct({
      workflow: Workflow,
      roomId: NanoId,
    }),
  });
}

export namespace DeliveryOptionsContract {
  export const tableName = "delivery_options";
  export const table = DatabaseContract.SyncTable<DeliveryOptionsTable>()(
    tableName,
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

  export const activePublishedRoomViewName = `active_published_room_${tableName}`;
  export const activePublishedRoomView =
    DatabaseContract.View<ActivePublishedRoomDeliveryOptionsView>()(
      activePublishedRoomViewName,
      table.Schema,
    );

  export const DeliveryOptions = Schema.Array(
    table.Schema.omit("index", "roomId", "tenantId"),
  ).pipe(
    Schema.filter(
      (opts) =>
        Array.from(new Set(opts.map((o) => o.id))).length === opts.length ||
        "Delivery option names must be unique",
    ),
  );

  export const set = new DataAccess.MutationSignature({
    name: "setDeliveryOptions",
    Args: Schema.Struct({
      options: DeliveryOptions,
      roomId: NanoId,
    }),
  });
}
