import * as Schema from "effect/Schema";

import { ColumnsContract } from "../columns2/contract";
import { ProceduresContract } from "../procedures/contract";
import { TablesContract } from "../tables2/contract";

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
  export const DataTransferStruct = Schema.Struct(DataTransferObject.fields);

  export const tableName = "customer_groups";
  export const table = TablesContract.makeTable<CustomerGroupsSchema.Table>()(
    tableName,
    DataTransferObject,
    ["read"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    TablesContract.makeView<CustomerGroupsSchema.ActiveView>()(
      activeViewName,
      DataTransferObject,
    );

  export const activeMembershipViewName = `active_membership_${tableName}`;
  export const activeMembershipView =
    TablesContract.makeView<CustomerGroupsSchema.ActiveMembershipView>()(
      activeMembershipViewName,
      Schema.Struct({
        ...DataTransferObject.fields,
        memberId: ColumnsContract.EntityId,
      }),
    );

  export const isMemberOf = new ProceduresContract.Procedure({
    name: "isMemberOfCustomerGroup",
    Args: Schema.Struct({
      ...DataTransferStruct.pick("id").fields,
      memberId: Schema.optional(ColumnsContract.EntityId),
    }),
    Returns: Schema.Void,
  });
}

export namespace CustomerGroupMembershipsContract {
  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    ...ColumnsContract.Tenant.fields,
    groupId: ColumnsContract.EntityId,
    memberId: ColumnsContract.EntityId,
  }) {}

  export const tableName = "customer_group_memberships";
  export const table =
    TablesContract.makeTable<CustomerGroupMembershipsSchema.Table>()(
      tableName,
      DataTransferObject,
      ["read"],
    );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    TablesContract.makeView<CustomerGroupMembershipsSchema.ActiveView>()(
      activeViewName,
      DataTransferObject,
    );
}
