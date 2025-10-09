import { Schema, Struct } from "effect";

import { ColumnsContract } from "../columns2/contract";
import { DataAccessContract } from "../data-access2/contract";
import { TablesContract } from "../tables2/contract";
import { Cost } from "../utils2";

import type { DeliveryOptionsSchema } from "./schema";

export namespace DeliveryOptionsContract {
  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    ...ColumnsContract.Tenant.fields,
    name: ColumnsContract.VarChar,
    description: ColumnsContract.VarChar,
    detailsLabel: ColumnsContract.VarChar.pipe(Schema.NullOr),
    cost: Cost.pipe(
      Schema.transform(Schema.String, {
        decode: String,
        encode: Number,
        strict: true,
      }),
      Schema.NullOr,
    ),
    roomId: ColumnsContract.EntityId,
  }) {}
  export const DataTransferStruct = Schema.Struct(DataTransferObject.fields);

  export const tableName = "delivery_options";
  export const table = TablesContract.makeTable<DeliveryOptionsSchema.Table>()(
    tableName,
    DataTransferObject,
    ["create", "read", "update", "delete"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    TablesContract.makeView<DeliveryOptionsSchema.ActiveView>()(
      activeViewName,
      DataTransferObject,
    );

  export const activePublishedRoomViewName = `active_published_room_${tableName}`;
  export const activePublishedRoomView =
    TablesContract.makeView<DeliveryOptionsSchema.ActivePublishedRoomView>()(
      activePublishedRoomViewName,
      DataTransferObject,
    );

  export const canEdit = new DataAccessContract.Procedure({
    name: "canEditDeliveryOption",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const canDelete = new DataAccessContract.Procedure({
    name: "canDeleteDeliveryOption",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const canRestore = new DataAccessContract.Procedure({
    name: "canRestoreDeliveryOption",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const create = new DataAccessContract.Procedure({
    name: "createDeliveryOption",
    Args: DataTransferStruct.omit("deletedAt", "tenantId"),
    Returns: DataTransferObject,
  });

  export const edit = new DataAccessContract.Procedure({
    name: "editDeliveryOption",
    Args: Schema.extend(
      DataTransferStruct.pick("id", "updatedAt"),
      DataTransferStruct.omit(
        ...Struct.keys(ColumnsContract.Tenant.fields),
        "roomId",
      ).pipe(Schema.partial),
    ),
    Returns: DataTransferObject,
  });

  export const delete_ = new DataAccessContract.Procedure({
    name: "deleteDeliveryOption",
    Args: Schema.Struct({
      id: ColumnsContract.EntityId,
      deletedAt: Schema.DateTimeUtc,
    }),
    Returns: DataTransferObject,
  });

  export const restore = new DataAccessContract.Procedure({
    name: "restoreDeliveryOption",
    Args: DataTransferStruct.pick("id"),
    Returns: DataTransferObject,
  });
}
