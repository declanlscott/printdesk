import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { ColumnsContract } from "../columns/contract";
import { ProceduresContract } from "../procedures/contract";
import { TablesContract } from "../tables/contract";
import { Cost } from "../utils";

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

  export const tableName = "delivery_options";
  export const table =
    new (TablesContract.makeClass<DeliveryOptionsSchema.Table>())(
      tableName,
      DataTransferObject,
      ["create", "read", "update", "delete"],
    );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    new (TablesContract.makeViewClass<DeliveryOptionsSchema.ActiveView>())(
      activeViewName,
      DataTransferObject,
    );

  export const activePublishedRoomViewName = `active_published_room_${tableName}`;
  export const activePublishedRoomView =
    new (TablesContract.makeViewClass<DeliveryOptionsSchema.ActivePublishedRoomView>())(
      activePublishedRoomViewName,
      DataTransferObject,
    );

  const IdOnly = Schema.Struct(
    Struct.evolve(Struct.pick(DataTransferObject.fields, "id"), {
      id: (id) => id.from,
    }),
  );

  export const canEdit = new ProceduresContract.Procedure({
    name: "canEditDeliveryOption",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  export const canDelete = new ProceduresContract.Procedure({
    name: "canDeleteDeliveryOption",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  export const canRestore = new ProceduresContract.Procedure({
    name: "canRestoreDeliveryOption",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  export const create = new ProceduresContract.Procedure({
    name: "createDeliveryOption",
    Args: DataTransferObject.pipe(Schema.omit("deletedAt", "tenantId")),
    Returns: DataTransferObject,
  });

  export const edit = new ProceduresContract.Procedure({
    name: "editDeliveryOption",
    Args: DataTransferObject.pipe(
      Schema.omit(...Struct.keys(ColumnsContract.Tenant.fields), "roomId"),
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

  export const delete_ = new ProceduresContract.Procedure({
    name: "deleteDeliveryOption",
    Args: Schema.Struct(
      Struct.evolve(Struct.pick(DataTransferObject.fields, "id", "deletedAt"), {
        id: (id) => id.from,
        deletedAt: (deletedAt) => deletedAt.from.members[0],
      }),
    ),
    Returns: DataTransferObject,
  });

  export const restore = new ProceduresContract.Procedure({
    name: "restoreDeliveryOption",
    Args: IdOnly,
    Returns: DataTransferObject,
  });
}
