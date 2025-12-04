import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { ColumnsContract } from "../columns/contract";
import { ProceduresContract } from "../procedures/contract";
import { TablesContract } from "../tables/contract";
import { generateId } from "../utils";

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
  export const table = new (TablesContract.makeClass<RoomsSchema.Table>())(
    tableName,
    DataTransferObject,
    ["create", "read", "update", "delete"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    new (TablesContract.makeViewClass<RoomsSchema.ActiveView>())(
      activeViewName,
      DataTransferObject,
    );

  export const activePublishedViewName = `active_published_${tableName}`;
  export const activePublishedView =
    new (TablesContract.makeViewClass<RoomsSchema.ActivePublishedView>())(
      activePublishedViewName,
      DataTransferObject,
    );

  export const canEdit = new ProceduresContract.Procedure({
    name: "canEditRoom",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const canDelete = new ProceduresContract.Procedure({
    name: "canDeleteRoom",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const canRestore = new ProceduresContract.Procedure({
    name: "canRestoreRoom",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const create = new ProceduresContract.Procedure({
    name: "createRoom",
    Args: Schema.Struct({
      ...DataTransferStruct.omit("deletedAt", "tenantId").fields,
      workflowId: ColumnsContract.EntityId.pipe(
        Schema.optionalWith({ default: generateId }),
      ),
    }),
    Returns: DataTransferObject,
  });

  export const edit = new ProceduresContract.Procedure({
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

  export const publish = new ProceduresContract.Procedure({
    name: "publishRoom",
    Args: DataTransferStruct.pick("id", "updatedAt"),
    Returns: DataTransferObject,
  });

  export const draft = new ProceduresContract.Procedure({
    name: "draftRoom",
    Args: DataTransferStruct.pick("id", "updatedAt"),
    Returns: DataTransferObject,
  });

  export const delete_ = new ProceduresContract.Procedure({
    name: "deleteRoom",
    Args: Schema.Struct({
      id: ColumnsContract.EntityId,
      deletedAt: Schema.DateTimeUtc,
    }),
    Returns: DataTransferStruct,
  });

  export const restore = new ProceduresContract.Procedure({
    name: "restoreRoom",
    Args: DataTransferStruct.pick("id"),
    Returns: DataTransferStruct,
  });
}
