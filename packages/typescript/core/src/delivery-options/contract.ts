import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";
import * as Struct from "effect/Struct";

import { ColumnsContract } from "../columns/contract";
import { Handler } from "../handlers";
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
        Schema.decodeTo(Schema.String, {
          decode: SchemaGetter.transform(String),
          encode: SchemaGetter.transform(Number),
        }),
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

  export const canEdit = new Handler.Handler({
    name: "canEditDeliveryOption",
    Input: IdOnly,
    Output: Schema.Void,
  });

  export const canDelete = new Handler.Handler({
    name: "canDeleteDeliveryOption",
    Input: IdOnly,
    Output: Schema.Void,
  });

  export const canRestore = new Handler.Handler({
    name: "canRestoreDeliveryOption",
    Input: IdOnly,
    Output: Schema.Void,
  });

  export const create = new Handler.Handler({
    name: "createDeliveryOption",
    Input: Table.Dto.mapFields(Struct.omit(["deletedAt", "tenantId"])),
    Output: Table.Dto,
  });

  export const edit = new Handler.Handler({
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

  export const delete_ = new Handler.Handler({
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

  export const restore = new Handler.Handler({
    name: "restoreDeliveryOption",
    Input: IdOnly,
    Output: Table.Dto,
  });
}
