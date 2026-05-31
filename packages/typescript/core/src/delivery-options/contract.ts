import * as Schema from "effect/Schema";
import * as SchemaTransformation from "effect/SchemaTransformation";
import * as Struct from "effect/Struct";

import { ColumnsContract } from "../columns/contract";
import { HandlersContract } from "../handlers/contract";
import { TablesContract } from "../tables/contract";
import { Cost, EntityId } from "../utils";

import type {
  ActiveDeliveryOptionsView,
  ActivePublishedRoomDeliveryOptionsView,
  DeliveryOptionsTable,
} from "./sql";

export namespace DeliveryOptionsContract {
  export class Table extends TablesContract.Table<DeliveryOptionsTable>("delivery_options")(
    {
      ...TablesContract.BaseSyncModel.fields,
      name: ColumnsContract.VarChar,
      description: ColumnsContract.VarChar,
      detailsLabel: ColumnsContract.VarChar.pipe(Schema.NullOr),
      cost: Cost.pipe(
        Schema.decodeTo(
          Schema.String,
          SchemaTransformation.transform({ decode: String, encode: Number }),
        ),
        Schema.NullOr,
      ),
      roomId: EntityId,
    },
    ["create", "read", "update", "delete"],
  ) {}

  export class ActiveView extends TablesContract.View<ActiveDeliveryOptionsView>(
    `active_${Table.name}`,
  )(
    Struct.evolve(Table.Model.fields, {
      deletedAt: (deletedAt) => deletedAt.schema.from.schema.members[0].members[1],
    }),
  ) {}

  export class ActivePublishedRoomView extends TablesContract.View<ActivePublishedRoomDeliveryOptionsView>(
    `active_published_room_${Table.name}`,
  )(ActiveView.Model.fields) {}

  const IdOnly = Schema.Struct(
    Struct.evolve(Struct.pick(Table.Model.fields, ["id"]), {
      id: (id) => id.from.schema.members[0],
    }),
  );

  export const canEdit = new HandlersContract.Handler({
    name: "canEditDeliveryOption",
    Input: IdOnly,
    Output: Schema.Void,
  });

  export const canDelete = new HandlersContract.Handler({
    name: "canDeleteDeliveryOption",
    Input: IdOnly,
    Output: Schema.Void,
  });

  export const canRestore = new HandlersContract.Handler({
    name: "canRestoreDeliveryOption",
    Input: IdOnly,
    Output: Schema.Void,
  });

  export const create = new HandlersContract.Handler({
    name: "createDeliveryOption",
    Input: Table.Dto.mapFields(Struct.omit(["deletedAt", "tenantId"])),
    Output: Table.Dto,
  });

  export const edit = new HandlersContract.Handler({
    name: "editDeliveryOption",
    Input: Table.Dto.mapFields(
      Struct.omit([...Struct.keys(TablesContract.BaseModel.fields), "roomId"]),
    )
      .mapFields(Struct.map(Schema.optional))
      .mapFields(
        Struct.assign(
          Struct.evolve(Struct.pick(Table.Model.fields, ["id", "updatedAt"]), {
            id: (id) => id.from.schema.members[0],
          }),
        ),
      ),
    Output: Table.Dto,
  });

  export const delete_ = new HandlersContract.Handler({
    name: "deleteDeliveryOption",
    Input: IdOnly.mapFields(
      Struct.assign(
        Struct.evolve(Struct.pick(Table.Model.fields, ["deletedAt"]), {
          deletedAt: (deletedAt) => deletedAt.schema.from.schema.members[0].members[0],
        }),
      ),
    ),
    Output: Table.Dto,
  });

  export const restore = new HandlersContract.Handler({
    name: "restoreDeliveryOption",
    Input: IdOnly,
    Output: Table.Dto,
  });
}
