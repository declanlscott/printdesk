import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { ColumnsContract } from "../columns/contract";
import { ProceduresContract } from "../procedures/contract";
import { TablesContract } from "../tables/contract";
import { Cost } from "../utils";

import type { DeliveryOptionsSchema } from "./schema";

export namespace DeliveryOptionsContract {
  export class Table extends TablesContract.Table<DeliveryOptionsSchema.Table>(
    "delivery_options",
  )(
    class Dto extends ColumnsContract.BaseEntity.extend<Dto>("DeliveryOption")({
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
    }) {},
    ["create", "read", "update", "delete"],
  ) {}

  export class ActiveView extends TablesContract.View<DeliveryOptionsSchema.ActiveView>(
    "active_delivery_options",
  )(
    class Dto extends Schema.Class<Dto>("ActiveDeliveryOption")(
      Struct.evolve(Table.DataTransferObject.fields, {
        deletedAt: (deletedAt) => deletedAt.from.members[1],
      }),
    ) {},
  ) {}

  export class ActivePublishedRoomView extends TablesContract.View<DeliveryOptionsSchema.ActivePublishedRoomView>(
    "active_published_room_delivery_options",
  )(ActiveView.DataTransferObject) {}

  const IdOnly = Schema.Struct(
    Struct.evolve(Struct.pick(Table.DataTransferObject.fields, "id"), {
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
    Args: Table.DataTransferObject.pipe(Schema.omit("deletedAt", "tenantId")),
    Returns: Table.DataTransferObject,
  });

  export const edit = new ProceduresContract.Procedure({
    name: "editDeliveryOption",
    Args: Table.DataTransferObject.pipe(
      Schema.omit(...Struct.keys(ColumnsContract.BaseEntity.fields), "roomId"),
      Schema.partial,
      Schema.extend(
        Schema.Struct(
          Struct.evolve(
            Struct.pick(Table.DataTransferObject.fields, "id", "updatedAt"),
            { id: (id) => id.from },
          ),
        ),
      ),
    ),
    Returns: Table.DataTransferObject,
  });

  export const delete_ = new ProceduresContract.Procedure({
    name: "deleteDeliveryOption",
    Args: Schema.Struct(
      Struct.evolve(
        Struct.pick(Table.DataTransferObject.fields, "id", "deletedAt"),
        {
          id: (id) => id.from,
          deletedAt: (deletedAt) => deletedAt.from.members[0],
        },
      ),
    ),
    Returns: Table.DataTransferObject,
  });

  export const restore = new ProceduresContract.Procedure({
    name: "restoreDeliveryOption",
    Args: IdOnly,
    Returns: Table.DataTransferObject,
  });
}
