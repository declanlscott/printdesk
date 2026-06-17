import * as Array from "effect/Array";

import { AnnouncementsContract } from "../announcements/contract";
import { ClientsContract } from "../clients/contract";
import { CommentsContract } from "../comments/contract";
import { DeliveryOptionsContract } from "../delivery-options/contract";
import { CustomerGroupMembershipsContract, CustomerGroupsContract } from "../groups/contracts";
import { IdentityProvidersContract } from "../identity/contract";
import { InvoicesContract } from "../invoices/contract";
import { LicensesContract } from "../licenses/contract";
import { OrdersContract } from "../orders/contract";
import { ProductsContract } from "../products/contract";
import { RoomsContract } from "../rooms/contract";
import {
  SharedAccountCustomerAccessContract,
  SharedAccountCustomerGroupAccessContract,
  SharedAccountManagerAccessContract,
  SharedAccountsContract,
} from "../shared-accounts/contracts";
import { TenantsContract } from "../tenants/contract";
import { UsersContract } from "../users/contract";
import {
  RoomWorkflowsContract,
  SharedAccountWorkflowsContract,
  WorkflowStatusesContract,
} from "../workflows/contracts";

export namespace Models {
  export const syncTables = Array.make(
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
  export type SyncTable = (typeof syncTables)[number];
  export type SyncTableName = SyncTable["name"];
  export type SyncTableByName<TName extends SyncTableName> = Extract<SyncTable, { name: TName }>;

  export const nonSyncTables = Array.make(
    ClientsContract.Table,
    IdentityProvidersContract.Table,
    LicensesContract.Table,
  );
  export type NonSyncTable = (typeof nonSyncTables)[number];
  export type NonSyncTableName = NonSyncTable["name"];
  export type NonSyncTableByName<TName extends NonSyncTableName> = Extract<
    NonSyncTable,
    { name: TName }
  >;

  export const syncViews = Array.make(
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
  export type SyncView = (typeof syncViews)[number];
  export type SyncViewName = SyncView["name"];
  export type SyncViewByName<TName extends SyncViewName> = Extract<SyncView, { name: TName }>;
}
