import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { ColumnsContract } from "../columns/contract";
import { ProceduresContract } from "../procedures/contract";
import { TablesContract } from "../tables/contract";

import type {
  CustomerGroupMembershipsSchema,
  CustomerGroupsSchema,
} from "./schemas";

export namespace CustomerGroupsContract {
  export class Table extends TablesContract.Table<CustomerGroupsSchema.Table>(
    "customer_groups",
  )(
    class Dto extends ColumnsContract.BaseEntity.extend<Dto>("CustomerGroup")({
      name: Schema.String,
      externalId: Schema.String,
      identityProviderId: ColumnsContract.EntityId,
    }) {},
    ["create", "read", "update", "delete"],
  ) {}

  export class ActiveView extends TablesContract.View<CustomerGroupsSchema.ActiveView>(
    "active_customer_groups",
  )(
    class Dto extends Schema.Class<Dto>("ActiveCustomerGroup")(
      Struct.evolve(Table.DataTransferObject.fields, {
        deletedAt: (deletedAt) => deletedAt.from.members[1],
      }),
    ) {},
  ) {}

  export class ActiveMembershipView extends TablesContract.View<CustomerGroupsSchema.ActiveMembershipView>(
    "active_membership_customer_groups",
  )(
    class Dto extends ActiveView.DataTransferObject.extend<Dto>(
      "ActiveMembershipCustomerGroup",
    )({ memberId: ColumnsContract.EntityId }) {},
  ) {}

  export const isMemberOf = new ProceduresContract.Procedure({
    name: "isMemberOfCustomerGroup",
    Args: Schema.Struct({
      ...Struct.evolve(Struct.pick(Table.DataTransferObject.fields, "id"), {
        id: (id) => id.from,
      }),
      memberId: ColumnsContract.EntityId.pipe(Schema.OptionFromUndefinedOr),
    }),
    Returns: Schema.Void,
  });
}

export namespace CustomerGroupMembershipsContract {
  export class Table extends TablesContract.Table<CustomerGroupMembershipsSchema.Table>(
    "customer_group_memberships",
  )(
    class Dto extends ColumnsContract.BaseEntity.extend<Dto>(
      "CustomerGroupMembership",
    )({
      customerGroupId: ColumnsContract.EntityId,
      memberId: ColumnsContract.EntityId,
    }) {},
    ["read"],
  ) {}

  export class ActiveView extends TablesContract.View<CustomerGroupMembershipsSchema.ActiveView>(
    "active_customer_group_memberships",
  )(
    class Dto extends Schema.Class<Dto>("ActiveCustomerGroupMembership")(
      Struct.evolve(Table.DataTransferObject.fields, {
        deletedAt: (deletedAt) => deletedAt.from.members[1],
      }),
    ) {},
  ) {}
}
