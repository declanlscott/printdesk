import { Schema, Struct } from "effect";

import { DataAccessContract } from "../data-access2/contract";
import { TableContract } from "../database2/contract";
import { generateId } from "../utils/shared";

import type { RoomsSchema } from "./schemas";

export namespace RoomsContract {
  export const statuses = ["draft", "published"] as const;
  export type Status = (typeof statuses)[number];

  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    ...TableContract.Tenant.fields,
    name: TableContract.VarChar,
    status: Schema.optionalWith(Schema.Literal(...statuses), {
      default: () => "draft",
    }),
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
    Args: Schema.Struct({
      ...DataTransferStruct.omit("deletedAt", "tenantId").fields,
      workflowId: Schema.optionalWith(TableContract.EntityId, {
        default: generateId,
      }),
    }),
    Returns: DataTransferObject,
  });

  export const edit = new DataAccessContract.Function({
    name: "editRoom",
    Args: Schema.extend(
      DataTransferStruct.pick("id", "updatedAt"),
      DataTransferStruct.omit(
        ...Struct.keys(TableContract.Tenant.fields),
        "status",
      ).pipe(Schema.partial),
    ),
    Returns: DataTransferObject,
  });

  export const publish = new DataAccessContract.Function({
    name: "publishRoom",
    Args: DataTransferStruct.pick("id", "updatedAt"),
    Returns: DataTransferObject,
  });

  export const draft = new DataAccessContract.Function({
    name: "draftRoom",
    Args: DataTransferStruct.pick("id", "updatedAt"),
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
