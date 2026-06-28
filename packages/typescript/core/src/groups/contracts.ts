import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { Handler } from "../handlers";
import { TablesContract } from "../tables/contract";
import { EntityId } from "../utils";

import type {
  ActiveCustomerGroupMembershipsView,
  ActiveCustomerGroupsView,
  ActiveMembershipCustomerGroupsView,
  CustomerGroupMembershipsTable,
  CustomerGroupsTable,
} from "./sql";

export namespace CustomerGroupsContract {
  export const Origin = Schema.Literals(["papercut", "internal"]);
  export type Origin = typeof Origin.Type;

  export const Name = Schema.String.pipe(Schema.brand("CustomerGroupName"));
  export type Name = typeof Name.Type;

  export const ExternalId = Schema.String.pipe(Schema.brand("CustomerGroupExternalId"));
  export type ExternalId = typeof ExternalId.Type;

  export class Table extends TablesContract.Table<CustomerGroupsTable>("customer_groups")(
    {
      ...TablesContract.BaseSyncModel.fields,
      origin: Origin,
      name: Name,
      externalId: ExternalId,
      identityProviderId: EntityId,
    },
    ["create", "read", "update", "delete"],
  ) {}

  export class ActiveView extends TablesContract.View<ActiveCustomerGroupsView>(
    `active_${Table.name}`,
  )(
    Struct.evolve(Table.Model.fields, {
      deletedAt: (deletedAt) => deletedAt.schema.from.schema.members[0].members[1],
    }),
  ) {}

  export class ActiveMembershipView extends TablesContract.View<ActiveMembershipCustomerGroupsView>(
    `active_membership_${Table.name}`,
  )({ ...ActiveView.Model.fields, memberId: EntityId }) {}

  export const isMemberOf = new Handler.Handler({
    name: "isMemberOfCustomerGroup",
    Input: Schema.Struct({
      ...Struct.evolve(Struct.pick(Table.Model.fields, ["id"]), {
        id: (id) => id.from.schema.members[0],
      }),
      memberId: EntityId.pipe(Schema.OptionFromUndefinedOr),
    }),
    Output: Schema.Void,
  });
}

export namespace CustomerGroupMembershipsContract {
  export class Table extends TablesContract.Table<CustomerGroupMembershipsTable>(
    "customer_group_memberships",
  )({ ...TablesContract.BaseSyncModel.fields, customerGroupId: EntityId, memberId: EntityId }, [
    "read",
  ]) {}

  export class ActiveView extends TablesContract.View<ActiveCustomerGroupMembershipsView>(
    `active_${Table.name}`,
  )(
    Struct.evolve(Table.Model.fields, {
      deletedAt: (deletedAt) => deletedAt.schema.from.schema.members[0].members[1],
    }),
  ) {}
}
