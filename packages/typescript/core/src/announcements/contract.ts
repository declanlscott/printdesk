import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { Handler } from "../handlers";
import { TablesContract } from "../tables/contract";
import { EntityId } from "../utils";

import type {
  ActiveAnnouncementsView,
  ActivePublishedRoomAnnouncementsView,
  AnnouncementsTable,
} from "./sql";

export namespace AnnouncementsContract {
  export class Table extends TablesContract.Table<AnnouncementsTable>("announcements")(
    {
      ...TablesContract.BaseSyncModel.fields,
      content: Schema.String,
      roomId: EntityId,
      authorId: EntityId,
    },
    ["create", "read", "update", "delete"],
  ) {}

  export class ActiveView extends TablesContract.View<ActiveAnnouncementsView>(
    `active_${Table.name}`,
  )(
    Struct.evolve(Table.Model.fields, {
      deletedAt: (deletedAt) => deletedAt.schema.from.schema.members[0].members[1],
    }),
  ) {}

  export class ActivePublishedRoomView extends TablesContract.View<ActivePublishedRoomAnnouncementsView>(
    `active_published_room_${Table.name}`,
  )(ActiveView.Model.fields) {}

  const IdOnly = Schema.Struct(
    Struct.evolve(Struct.pick(Table.Model.fields, ["id"]), {
      id: (id) => id.from.schema.members[0],
    }),
  );

  export const canEdit = new Handler.Handler({
    name: "canEditAnnouncement",
    Input: IdOnly,
    Output: Schema.Void,
  });

  export const canDelete = new Handler.Handler({
    name: "canDeleteAnnouncement",
    Input: IdOnly,
    Output: Schema.Void,
  });

  export const canRestore = new Handler.Handler({
    name: "canRestoreAnnouncement",
    Input: IdOnly,
    Output: Schema.Void,
  });

  export const create = new Handler.Handler({
    name: "createAnnouncement",
    Input: Table.Dto.mapFields(Struct.omit(["authorId", "deletedAt", "tenantId"])),
    Output: Table.Dto,
  });

  export const edit = new Handler.Handler({
    name: "editAnnouncement",
    Input: Table.Dto.mapFields(
      Struct.omit([...Struct.keys(TablesContract.BaseModel.fields), "roomId", "authorId"]),
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
    name: "deleteAnnouncement",
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
    name: "restoreAnnouncement",
    Input: IdOnly,
    Output: Table.Dto,
  });
}
