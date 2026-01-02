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
import { IdentityProvidersContract } from "../identity-providers/contract";
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
    AnnouncementsContract.table,
    CommentsContract.table,
    CustomerGroupsContract.table,
    CustomerGroupMembershipsContract.table,
    DeliveryOptionsContract.table,
    InvoicesContract.table,
    OrdersContract.table,
    ProductsContract.table,
    RoomsContract.table,
    SharedAccountsContract.table,
    SharedAccountCustomerAccessContract.table,
    SharedAccountManagerAccessContract.table,
    SharedAccountCustomerGroupAccessContract.table,
    TenantsContract.table,
    UsersContract.table,
    RoomWorkflowsContract.table,
    SharedAccountWorkflowsContract.table,
    WorkflowStatusesContract.table,
  );
  export const syncTables = record(allSyncTables);
  export type SyncTable = (typeof syncTables)[keyof typeof syncTables];
  export type SyncTableName = SyncTable["name"];
  export type SyncTableByName<TName extends SyncTableName> = Extract<
    SyncTable,
    { name: TName }
  >;

  export const allNonSyncTables = Array.make(IdentityProvidersContract.table);
  export const nonSyncTables = record(allNonSyncTables);
  export type NonSyncTable = (typeof nonSyncTables)[keyof typeof nonSyncTables];
  export type NonSyncTableName = NonSyncTable["name"];
  export type NonSyncTableByName<TName extends NonSyncTableName> = Extract<
    NonSyncTable,
    { name: TName }
  >;

  export const allInternalTables = Array.make(
    LicensesContract.table,
    TenantMetadataContract.table,
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
    AnnouncementsContract.activeView,
    AnnouncementsContract.activePublishedRoomView,
    SharedAccountsContract.activeView,
    SharedAccountsContract.activeCustomerAuthorizedView,
    SharedAccountsContract.activeManagerAuthorizedView,
    SharedAccountCustomerAccessContract.activeView,
    SharedAccountCustomerAccessContract.activeAuthorizedView,
    SharedAccountManagerAccessContract.activeView,
    SharedAccountManagerAccessContract.activeAuthorizedView,
    SharedAccountManagerAccessContract.activeCustomerAuthorizedView,
    SharedAccountCustomerGroupAccessContract.activeView,
    SharedAccountCustomerGroupAccessContract.activeAuthorizedView,
    CommentsContract.activeView,
    CommentsContract.activeManagerAuthorizedSharedAccountOrderView,
    CommentsContract.activeCustomerPlacedOrderView,
    CustomerGroupsContract.activeView,
    CustomerGroupsContract.activeMembershipView,
    CustomerGroupMembershipsContract.activeView,
    DeliveryOptionsContract.activeView,
    DeliveryOptionsContract.activePublishedRoomView,
    InvoicesContract.activeView,
    InvoicesContract.activeManagerAuthorizedSharedAccountOrderView,
    InvoicesContract.activeCustomerPlacedOrderView,
    OrdersContract.activeView,
    OrdersContract.activeManagerAuthorizedSharedAccountView,
    OrdersContract.activeCustomerPlacedView,
    ProductsContract.activeView,
    ProductsContract.activePublishedView,
    RoomsContract.activeView,
    RoomsContract.activePublishedView,
    UsersContract.activeView,
    RoomWorkflowsContract.activeView,
    RoomWorkflowsContract.activePublishedRoomView,
    SharedAccountWorkflowsContract.activeView,
    SharedAccountWorkflowsContract.activeCustomerAuthorizedView,
    SharedAccountWorkflowsContract.activeManagerAuthorizedView,
    WorkflowStatusesContract.activeView,
    WorkflowStatusesContract.activePublishedRoomView,
    WorkflowStatusesContract.activeCustomerAuthorizedSharedAccountView,
    WorkflowStatusesContract.activeManagerAuthorizedSharedAccountView,
  );
  export const syncViews = record(allSyncViews);
  export type SyncView = (typeof syncViews)[keyof typeof syncViews];
  export type SyncViewName = SyncView["name"];
  export type SyncViewByName<TName extends SyncViewName> = Extract<
    SyncView,
    { name: TName }
  >;
}
