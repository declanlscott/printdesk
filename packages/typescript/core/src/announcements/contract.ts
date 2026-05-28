import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { ProceduresContract } from "../procedures/contract";
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

  export const canEdit = new ProceduresContract.Procedure({
    name: "canEditAnnouncement",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  export const canDelete = new ProceduresContract.Procedure({
    name: "canDeleteAnnouncement",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  export const canRestore = new ProceduresContract.Procedure({
    name: "canRestoreAnnouncement",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  export const create = new ProceduresContract.Procedure({
    name: "createAnnouncement",
    Args: Table.Dto.mapFields(Struct.omit(["authorId", "deletedAt", "tenantId"])),
    Returns: Table.Dto,
  });

  export const edit = new ProceduresContract.Procedure({
    name: "editAnnouncement",
    Args: Table.Dto.mapFields(
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
    Returns: Table.Dto,
  });

  export const delete_ = new ProceduresContract.Procedure({
    name: "deleteAnnouncement",
    Args: IdOnly.mapFields(
      Struct.assign(
        Struct.evolve(Struct.pick(Table.Model.fields, ["deletedAt"]), {
          deletedAt: (deletedAt) => deletedAt.schema.from.schema.members[0].members[0],
        }),
      ),
    ),
    Returns: Table.Dto,
  });

  export const restore = new ProceduresContract.Procedure({
    name: "restoreAnnouncement",
    Args: IdOnly,
    Returns: Table.Dto,
  });
}
