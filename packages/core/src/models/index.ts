import * as Array from "effect/Array";
import * as Record from "effect/Record";
import * as Tuple from "effect/Tuple";

import { AnnouncementsContract } from "../announcements/contract";
import { CommentsContract } from "../comments/contract";
import { DeliveryOptionsContract } from "../delivery-options/contract";
import {
  CustomerGroupMembershipsContract,
  CustomerGroupsContract,
} from "../groups/contracts";
import { IdentityProvidersContract } from "../identity/contract";
import { InvoicesContract } from "../invoices/contract";
import { OrdersContract } from "../orders/contract";
import { ProductsContract } from "../products/contract";
import { RoomsContract } from "../rooms/contract";
import {
  SharedAccountCustomerAccessContract,
  SharedAccountCustomerGroupAccessContract,
  SharedAccountManagerAccessContract,
  SharedAccountsContract,
} from "../shared-accounts/contracts";
import {
  LicensesContract,
  TenantMetadataContract,
  TenantsContract,
} from "../tenants/contracts";
import { UsersContract } from "../users/contract";
import {
  RoomWorkflowsContract,
  SharedAccountWorkflowsContract,
  WorkflowStatusesContract,
} from "../workflows/contracts";

/**
 * Exports services including every database model excluding replicache's because it depends on sync tables.
 */
export namespace Models {
  const record = <
    TTables extends
      | typeof allSyncTables
      | typeof allNonSyncTables
      | typeof allInternalTables
      | typeof allSyncViews,
  >(
    tables: TTables,
  ) =>
    Record.fromEntries(
      Tuple.map(tables, (table) => Tuple.make(table.name, table)),
    ) as {
      readonly [TName in TTables[number]["name"]]: Extract<
        TTables[number],
        { name: TName }
      >;
    };

  export const allSyncTables = Array.make(
    AnnouncementsContract.Table,
    CommentsContract.Table,
    DeliveryOptionsContract.Table,
    CustomerGroupsContract.Table,
    CustomerGroupMembershipsContract.Table,
    InvoicesContract.Table,
    OrdersContract.Table,
    ProductsContract.Table,
    RoomsContract.Table,
    SharedAccountsContract.Table,
    SharedAccountCustomerAccessContract.Table,
    SharedAccountManagerAccessContract.Table,
    SharedAccountCustomerGroupAccessContract.Table,
    TenantsContract.Table,
    UsersContract.Table,
    RoomWorkflowsContract.Table,
    SharedAccountWorkflowsContract.Table,
    WorkflowStatusesContract.Table,
  );
  export const syncTables = record(allSyncTables);
  export type SyncTable = (typeof syncTables)[keyof typeof syncTables];
  export type SyncTableName = SyncTable["name"];
  export type SyncTableByName<TName extends SyncTableName> = Extract<
    SyncTable,
    { name: TName }
  >;

  export const allNonSyncTables = Array.make(IdentityProvidersContract.Table);
  export const nonSyncTables = record(allNonSyncTables);
  export type NonSyncTable = (typeof nonSyncTables)[keyof typeof nonSyncTables];
  export type NonSyncTableName = NonSyncTable["name"];
  export type NonSyncTableByName<TName extends NonSyncTableName> = Extract<
    NonSyncTable,
    { name: TName }
  >;

  export const allInternalTables = Array.make(
    LicensesContract.Table,
    TenantMetadataContract.Table,
  );
  export const internalTables = record(allInternalTables);
  export type InternalTable =
    (typeof internalTables)[keyof typeof internalTables];
  export type InternalTableName = InternalTable["name"];
  export type InternalTableByName<TName extends InternalTableName> = Extract<
    InternalTable,
    { name: TName }
  >;

  export const allSyncViews = Array.make(
    AnnouncementsContract.ActiveView,
    AnnouncementsContract.ActivePublishedRoomView,
    CommentsContract.ActiveView,
    CommentsContract.ActiveManagerAuthorizedSharedAccountOrderView,
    CommentsContract.ActiveCustomerPlacedOrderView,
    DeliveryOptionsContract.ActiveView,
    DeliveryOptionsContract.ActivePublishedRoomView,
    CustomerGroupsContract.ActiveView,
    CustomerGroupsContract.ActiveMembershipView,
    CustomerGroupMembershipsContract.ActiveView,
    InvoicesContract.ActiveView,
    InvoicesContract.ActiveManagerAuthorizedSharedAccountOrderView,
    InvoicesContract.ActiveCustomerPlacedOrderView,
    OrdersContract.ActiveView,
    OrdersContract.ActiveManagerAuthorizedSharedAccountView,
    OrdersContract.ActiveCustomerPlacedView,
    ProductsContract.ActiveView,
    ProductsContract.ActivePublishedView,
    RoomsContract.ActiveView,
    RoomsContract.ActivePublishedView,
    UsersContract.ActiveView,
    RoomWorkflowsContract.ActiveView,
    RoomWorkflowsContract.ActivePublishedRoomView,
    SharedAccountsContract.ActiveView,
    SharedAccountsContract.ActiveCustomerAuthorizedView,
    SharedAccountsContract.ActiveManagerAuthorizedView,
    SharedAccountCustomerAccessContract.ActiveView,
    SharedAccountCustomerAccessContract.ActiveAuthorizedView,
    SharedAccountManagerAccessContract.ActiveView,
    SharedAccountManagerAccessContract.ActiveAuthorizedView,
    SharedAccountManagerAccessContract.ActiveCustomerAuthorizedView,
    SharedAccountCustomerGroupAccessContract.ActiveView,
    SharedAccountCustomerGroupAccessContract.ActiveAuthorizedView,
    SharedAccountWorkflowsContract.ActiveView,
    SharedAccountWorkflowsContract.ActiveCustomerAuthorizedView,
    SharedAccountWorkflowsContract.ActiveManagerAuthorizedView,
    WorkflowStatusesContract.ActiveView,
    WorkflowStatusesContract.ActivePublishedRoomView,
    WorkflowStatusesContract.ActiveCustomerAuthorizedSharedAccountView,
    WorkflowStatusesContract.ActiveManagerAuthorizedSharedAccountView,
  );
  export const syncViews = record(allSyncViews);
  export type SyncView = (typeof syncViews)[keyof typeof syncViews];
  export type SyncViewName = SyncView["name"];
  export type SyncViewByName<TName extends SyncViewName> = Extract<
    SyncView,
    { name: TName }
  >;
}
