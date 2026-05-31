import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { ColumnsContract } from "../columns/contract";
import { HandlersContract } from "../handlers/contract";
import { TablesContract } from "../tables/contract";
import { EntityId, generateEntityId } from "../utils";

import type { ActivePublishedRoomsView, ActiveRoomsView, RoomsTable } from "./sql";

export namespace RoomsContract {
  export const statuses = ["draft", "published"] as const;
  export type Status = (typeof statuses)[number];

  export class Table extends TablesContract.Table<RoomsTable>("rooms")(
    {
      ...TablesContract.BaseSyncModel.fields,
      name: ColumnsContract.VarChar,
      status: Schema.Literals(statuses).pipe(
        Schema.withDecodingDefaultType(Effect.succeed("draft")),
      ),
      details: Schema.String.pipe(Schema.NullOr),
    },
    ["create", "read", "update", "delete"],
  ) {}

  export class ActiveView extends TablesContract.View<ActiveRoomsView>(`active_${Table.name}`)(
    Struct.evolve(Table.Model.fields, {
      deletedAt: (deletedAt) => deletedAt.schema.from.schema.members[0].members[1],
    }),
  ) {}

  export class ActivePublishedView extends TablesContract.View<ActivePublishedRoomsView>(
    `active_published_${Table.name}`,
  )(
    Struct.evolve(ActiveView.Model.fields, {
      status: (status) => Schema.Literal(status.from.schema.members[0].literals[1]),
    }),
  ) {}

  const IdOnly = Schema.Struct(
    Struct.evolve(Struct.pick(Table.Model.fields, ["id"]), {
      id: (id) => id.from.schema.members[0],
    }),
  );

  const IdAndUpdatedAt = IdOnly.mapFields(
    Struct.assign(Struct.pick(Table.Model.fields, ["updatedAt"])),
  );

  export const canEdit = new HandlersContract.Handler({
    name: "canEditRoom",
    Input: IdOnly,
    Output: Schema.Void,
  });

  export const canDelete = new HandlersContract.Handler({
    name: "canDeleteRoom",
    Input: IdOnly,
    Output: Schema.Void,
  });

  export const canRestore = new HandlersContract.Handler({
    name: "canRestoreRoom",
    Input: IdOnly,
    Output: Schema.Void,
  });

  export const create = new HandlersContract.Handler({
    name: "createRoom",
    Input: Table.Dto.mapFields(Struct.omit(["deletedAt", "tenantId"])).mapFields(
      Struct.assign({
        workflowId: EntityId.pipe(Schema.withDecodingDefaultType(generateEntityId)),
      }),
    ),
    Output: Table.Dto,
  });

  export const edit = new HandlersContract.Handler({
    name: "editRoom",
    Input: Table.Dto.mapFields(
      Struct.omit([...Struct.keys(TablesContract.BaseModel.fields), "status"]),
    )
      .mapFields(Struct.map(Schema.optional))
      .mapFields(Struct.assign(IdAndUpdatedAt.fields)),
    Output: Table.Dto,
  });

  export const publish = new HandlersContract.Handler({
    name: "publishRoom",
    Input: IdAndUpdatedAt,
    Output: Table.Dto,
  });

  export const draft = new HandlersContract.Handler({
    name: "draftRoom",
    Input: IdAndUpdatedAt,
    Output: Table.Dto,
  });

  export const delete_ = new HandlersContract.Handler({
    name: "deleteRoom",
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
    name: "restoreRoom",
    Input: IdOnly,
    Output: Table.Dto,
  });
}
