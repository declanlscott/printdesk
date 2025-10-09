import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { ColumnsContract } from "../columns2/contract";
import { DataAccessContract } from "../data-access2/contract";
import { TablesContract } from "../tables2/contract";
import { generateId } from "../utils/shared";

import type { RoomsSchema } from "./schema";

export namespace RoomsContract {
  export const statuses = ["draft", "published"] as const;
  export type Status = (typeof statuses)[number];

  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    ...ColumnsContract.Tenant.fields,
    name: ColumnsContract.VarChar,
    status: Schema.Literal(...statuses).pipe(
      Schema.optionalWith({ default: () => "draft" }),
    ),
    details: Schema.String.pipe(Schema.NullOr),
  }) {}
  export const DataTransferStruct = Schema.Struct(DataTransferObject.fields);

  export const tableName = "rooms";
  export const table = TablesContract.makeTable<RoomsSchema.Table>()(
    tableName,
    DataTransferObject,
    ["create", "read", "update", "delete"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView = TablesContract.makeView<RoomsSchema.ActiveView>()(
    activeViewName,
    DataTransferObject,
  );

  export const activePublishedViewName = `active_published_${tableName}`;
  export const activePublishedView =
    TablesContract.makeView<RoomsSchema.ActivePublishedView>()(
      activePublishedViewName,
      DataTransferObject,
    );

  export const canEdit = new DataAccessContract.Procedure({
    name: "canEditRoom",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const canDelete = new DataAccessContract.Procedure({
    name: "canDeleteRoom",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const canRestore = new DataAccessContract.Procedure({
    name: "canRestoreRoom",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const create = new DataAccessContract.Procedure({
    name: "createRoom",
    Args: Schema.Struct({
      ...DataTransferStruct.omit("deletedAt", "tenantId").fields,
      workflowId: ColumnsContract.EntityId.pipe(
        Schema.optionalWith({ default: generateId }),
      ),
    }),
    Returns: DataTransferObject,
  });

  export const edit = new DataAccessContract.Procedure({
    name: "editRoom",
    Args: Schema.extend(
      DataTransferStruct.pick("id", "updatedAt"),
      DataTransferStruct.omit(
        ...Struct.keys(ColumnsContract.Tenant.fields),
        "status",
      ).pipe(Schema.partial),
    ),
    Returns: DataTransferObject,
  });

  export const publish = new DataAccessContract.Procedure({
    name: "publishRoom",
    Args: DataTransferStruct.pick("id", "updatedAt"),
    Returns: DataTransferObject,
  });

  export const draft = new DataAccessContract.Procedure({
    name: "draftRoom",
    Args: DataTransferStruct.pick("id", "updatedAt"),
    Returns: DataTransferObject,
  });

  export const delete_ = new DataAccessContract.Procedure({
    name: "deleteRoom",
    Args: Schema.Struct({
      id: ColumnsContract.EntityId,
      deletedAt: Schema.DateTimeUtc,
    }),
    Returns: DataTransferStruct,
  });

  export const restore = new DataAccessContract.Procedure({
    name: "restoreRoom",
    Args: DataTransferStruct.pick("id"),
    Returns: DataTransferStruct,
  });
}
