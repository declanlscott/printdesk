import { Schema, Struct } from "effect";

import { DataAccessContract } from "../data-access2/contract";
import { TableContract } from "../database2/contract";
import { Cost } from "../utils2";

import type { DeliveryOptionsSchema } from "./schema";

export namespace DeliveryOptionsContract {
  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    ...TableContract.Tenant.fields,
    name: TableContract.VarChar,
    description: TableContract.VarChar,
    detailsLabel: Schema.NullOr(TableContract.VarChar),
    cost: Schema.NullOr(
      Schema.transform(Cost, Schema.String, {
        decode: String,
        encode: Number,
        strict: true,
      }),
    ),
    index: Schema.NonNegativeInt,
    roomId: TableContract.EntityId,
  }) {}
  export const DataTransferStruct = Schema.Struct(DataTransferObject.fields);

  export const tableName = "delivery_options";
  export const table = TableContract.Sync<DeliveryOptionsSchema.Table>()(
    tableName,
    DataTransferObject,
    ["create", "read", "update", "delete"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    TableContract.View<DeliveryOptionsSchema.ActiveView>()(
      activeViewName,
      DataTransferObject,
    );

  export const activePublishedRoomViewName = `active_published_room_${tableName}`;
  export const activePublishedRoomView =
    TableContract.View<DeliveryOptionsSchema.ActivePublishedRoomView>()(
      activePublishedRoomViewName,
      DataTransferObject,
    );

  export const append = new DataAccessContract.Function({
    name: "appendDeliveryOption",
    Args: DataTransferStruct.omit("index", "deletedAt", "tenantId"),
    Returns: DataTransferObject,
  });

  export const edit = new DataAccessContract.Function({
    name: "editDeliveryOption",
    Args: Schema.extend(
      DataTransferStruct.pick("id", "updatedAt"),
      DataTransferStruct.omit(
        ...Struct.keys(TableContract.Tenant.fields),
        "roomId",
        "index",
      ).pipe(Schema.partial),
    ),
    Returns: DataTransferObject,
  });

  export const reorder = new DataAccessContract.Function({
    name: "reorderDeliveryOptions",
    Args: Schema.Struct({
      ...DataTransferStruct.pick("roomId", "updatedAt").fields,
      oldIndex: Schema.NonNegativeInt,
      newIndex: Schema.NonNegativeInt,
    }),
    Returns: Schema.Array(DataTransferObject),
  });

  export class InvalidReorderDeltaError extends Schema.TaggedError<InvalidReorderDeltaError>(
    "InvalidReorderDeltaError",
  )("InvalidReorderDeltaError", {
    sliceLength: Schema.NonNegativeInt,
    absoluteDelta: Schema.NonNegativeInt,
  }) {}

  export const delete_ = new DataAccessContract.Function({
    name: "deleteDeliveryOption",
    Args: Schema.Struct({
      id: TableContract.EntityId,
      deletedAt: Schema.DateTimeUtc,
    }),
    Returns: DataTransferObject,
  });
}
