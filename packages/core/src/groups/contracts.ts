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
  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    ...ColumnsContract.Tenant.fields,
    name: Schema.String,
    externalId: Schema.String,
    identityProviderId: ColumnsContract.EntityId,
  }) {}

  export const tableName = "customer_groups";
  export const table =
    new (TablesContract.makeClass<CustomerGroupsSchema.Table>())(
      tableName,
      DataTransferObject,
      ["create", "read", "update", "delete"],
    );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    new (TablesContract.makeViewClass<CustomerGroupsSchema.ActiveView>())(
      activeViewName,
      DataTransferObject,
    );

  export const activeMembershipViewName = `active_membership_${tableName}`;
  export const activeMembershipView =
    new (TablesContract.makeViewClass<CustomerGroupsSchema.ActiveMembershipView>())(
      activeMembershipViewName,
      Schema.Struct({
        ...DataTransferObject.fields,
        memberId: ColumnsContract.EntityId,
      }),
    );

  export const isMemberOf = new ProceduresContract.Procedure({
    name: "isMemberOfCustomerGroup",
    Args: Schema.Struct({
      ...Struct.evolve(Struct.pick(DataTransferObject.fields, "id"), {
        id: (id) => id.from,
      }),
      memberId: ColumnsContract.EntityId.pipe(Schema.OptionFromUndefinedOr),
    }),
    Returns: Schema.Void,
  });
}

export namespace CustomerGroupMembershipsContract {
  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    ...ColumnsContract.Tenant.fields,
    customerGroupId: ColumnsContract.EntityId,
    memberId: ColumnsContract.EntityId,
  }) {}

  export const tableName = "customer_group_memberships";
  export const table =
    new (TablesContract.makeClass<CustomerGroupMembershipsSchema.Table>())(
      tableName,
      DataTransferObject,
      ["read"],
    );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    new (TablesContract.makeViewClass<CustomerGroupMembershipsSchema.ActiveView>())(
      activeViewName,
      DataTransferObject,
    );
}
