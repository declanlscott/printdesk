import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { Handler } from "../handlers";
import { TablesContract } from "../tables/contract";
import { EntityId } from "../utils";

import type {
  ActiveGroupMembershipsView,
  ActiveGroupsView,
  ActiveMembershipGroupsView,
  GroupMembershipsTable,
  GroupsTable,
} from "./sql";

export namespace GroupsContract {
  export const Name = Schema.String.pipe(Schema.brand("GroupName"));
  export type Name = typeof Name.Type;

  export const ExternalId = Schema.String.pipe(Schema.brand("GroupExternalId"));
  export type ExternalId = typeof ExternalId.Type;

  export class Table extends TablesContract.Table<GroupsTable>("groups")(
    {
      ...TablesContract.BaseSyncModel.fields,
      name: Name,
      externalId: ExternalId,
      identityProviderId: EntityId,
    },
    ["create", "read", "update", "delete"],
  ) {}

  export class ActiveView extends TablesContract.View<ActiveGroupsView>(`active_${Table.name}`)(
    Struct.evolve(Table.Model.fields, {
      deletedAt: (deletedAt) => deletedAt.schema.from.schema.members[0].members[1],
    }),
  ) {}

  export class ActiveMembershipView extends TablesContract.View<ActiveMembershipGroupsView>(
    `active_membership_${Table.name}`,
  )({ ...ActiveView.Model.fields, userId: EntityId }) {}

  export const isMemberOf = new Handler.Handler({
    name: "isMemberOfGroup",
    Input: Schema.Struct({
      ...Struct.evolve(Struct.pick(Table.Model.fields, ["id"]), {
        id: (id) => id.from.schema.members[0],
      }),
      userId: EntityId.pipe(Schema.OptionFromUndefinedOr),
    }),
    Output: Schema.Void,
  });
}

export namespace GroupMembershipsContract {
  export class Table extends TablesContract.Table<GroupMembershipsTable>("group_memberships")(
    {
      ...TablesContract.BaseSyncModel.fields,
      groupId: EntityId,
      userId: EntityId,
    },
    ["create", "read", "update", "delete"],
  ) {}

  export class ActiveView extends TablesContract.View<ActiveGroupMembershipsView>(
    `active_${Table.name}`,
  )(
    Struct.evolve(Table.Model.fields, {
      deletedAt: (deletedAt) => deletedAt.schema.from.schema.members[0].members[1],
    }),
  ) {}
}
