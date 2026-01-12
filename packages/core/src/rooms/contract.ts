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

  const IdOnly = Schema.Struct(
    Struct.evolve(Struct.pick(DataTransferObject.fields, "id"), {
      id: (id) => id.from,
    }),
  );

  const IdAndUpdatedAt = Schema.Struct(
    Struct.evolve(Struct.pick(DataTransferObject.fields, "id", "updatedAt"), {
      id: (id) => id.from,
    }),
  );

  export const canEdit = new ProceduresContract.Procedure({
    name: "canEditRoom",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  export const canDelete = new ProceduresContract.Procedure({
    name: "canDeleteRoom",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  export const canRestore = new ProceduresContract.Procedure({
    name: "canRestoreRoom",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  export const create = new ProceduresContract.Procedure({
    name: "createRoom",
    Args: DataTransferObject.pipe(
      Schema.omit("deletedAt", "tenantId"),
      Schema.extend(
        Schema.Struct({
          workflowId: ColumnsContract.EntityId.pipe(
            Schema.optionalWith({ default: generateId }),
          ),
        }),
      ),
    ),
    Returns: DataTransferObject,
  });

  export const edit = new ProceduresContract.Procedure({
    name: "editRoom",
    Args: DataTransferObject.pipe(
      Schema.omit(...Struct.keys(ColumnsContract.Tenant.fields), "status"),
      Schema.partial,
      Schema.extend(
        Schema.Struct(
          Struct.evolve(
            Struct.pick(DataTransferObject.fields, "id", "updatedAt"),
            { id: (id) => id.from },
          ),
        ),
      ),
    ),
    Returns: DataTransferObject,
  });

  export const publish = new ProceduresContract.Procedure({
    name: "publishRoom",
    Args: IdAndUpdatedAt,
    Returns: DataTransferObject,
  });

  export const draft = new ProceduresContract.Procedure({
    name: "draftRoom",
    Args: IdAndUpdatedAt,
    Returns: DataTransferObject,
  });

  export const delete_ = new ProceduresContract.Procedure({
    name: "deleteRoom",
    Args: Schema.Struct(
      Struct.evolve(Struct.pick(DataTransferObject.fields, "id", "deletedAt"), {
        id: (id) => id.from,
        deletedAt: (deletedAt) => deletedAt.from,
      }),
    ),
    Returns: DataTransferObject,
  });

  export const restore = new ProceduresContract.Procedure({
    name: "restoreRoom",
    Args: IdOnly,
    Returns: DataTransferObject,
  });
}
