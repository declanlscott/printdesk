import * as Effect from "effect/Effect";

import { AnnouncementsContract } from "../announcements2/contract";
import { CommentsContract } from "../comments2/contract";
import { DeliveryOptionsContract } from "../delivery-options2/contract";
import {
  IdentityProvidersContract,
  IdentityProviderUserGroupsContract,
} from "../identity-providers2/contracts";
import { InvoicesContract } from "../invoices2/contract";
import { OrdersContract } from "../orders2/contract";
import { ProductsContract } from "../products2/contract";
import { RoomsContract } from "../rooms2/contract";
import {
  SharedAccountCustomerAuthorizationsContract,
  SharedAccountManagerAuthorizationsContract,
  SharedAccountsContract,
} from "../shared-accounts2/contracts";
import {
  LicensesContract,
  TenantMetadataContract,
  TenantsContract,
} from "../tenants2/contracts";
import { UsersContract } from "../users2/contract";
import {
  RoomWorkflowsContract,
  SharedAccountWorkflowsContract,
  WorkflowStatusesContract,
} from "../workflows2/contracts";

/**
 * Exports services including every database model excluding replicache's because it depends on sync tables.
 */
export namespace Models {
  export const syncTables = {
    announcements: AnnouncementsContract.table,
    comments: CommentsContract.table,
    deliveryOptions: DeliveryOptionsContract.table,
    invoices: InvoicesContract.table,
    orders: OrdersContract.table,
    products: ProductsContract.table,
    rooms: RoomsContract.table,
    sharedAccounts: SharedAccountsContract.table,
    sharedAccountCustomerAuthorizations:
      SharedAccountCustomerAuthorizationsContract.table,
    sharedAccountManagerAuthorizations:
      SharedAccountManagerAuthorizationsContract.table,
    tenants: TenantsContract.table,
    users: UsersContract.table,
    roomWorkflows: RoomWorkflowsContract.table,
    sharedAccountWorkflows: SharedAccountWorkflowsContract.table,
    workflowStatuses: WorkflowStatusesContract.table,
  };
  export class SyncTables extends Effect.Service<SyncTables>()(
    "@printdesk/core/models/SyncTables",
    { accessors: true, effect: Effect.all(syncTables) },
  ) {}
  export type SyncTable = SyncTables[keyof Omit<SyncTables, "_tag">];
  export type SyncTableName = SyncTable["name"];
  export type SyncTableByName<TName extends SyncTableName> = Extract<
    SyncTable,
    { name: TName }
  >;

  export const nonSyncTables = {
    identityProviders: IdentityProvidersContract.table,
  };
  export class NonSyncTables extends Effect.Service<NonSyncTables>()(
    "@printdesk/core/models/NonSyncTables",
    { accessors: true, effect: Effect.all(nonSyncTables) },
  ) {}
  export type NonSyncTable = NonSyncTables[keyof Omit<NonSyncTables, "_tag">];
  export type NonSyncTableName = NonSyncTable["name"];
  export type NonSyncTableByName<TName extends NonSyncTableName> = Extract<
    NonSyncTable,
    { name: TName }
  >;

  export const internalTables = {
    identityProviderUserGroups: IdentityProviderUserGroupsContract.table,
    licenses: LicensesContract.table,
    tenantMetadata: TenantMetadataContract.table,
  };
  export class InternalTables extends Effect.Service<InternalTables>()(
    "@printdesk/core/models/InternalTables",
    { accessors: true, effect: Effect.all(internalTables) },
  ) {}
  export type InternalTable = InternalTables[keyof Omit<
    InternalTables,
    "_tag"
  >];
  export type InternalTableName = InternalTable["name"];
  export type InternalTableByName<TName extends InternalTableName> = Extract<
    InternalTable,
    { name: TName }
  >;

  export const views = {
    activeAnnouncements: AnnouncementsContract.activeView,
    activePublishedRoomAnnouncements:
      AnnouncementsContract.activePublishedRoomView,
    activeSharedAccounts: SharedAccountsContract.activeView,
    activeCustomerAuthorizedSharedAccounts:
      SharedAccountsContract.activeCustomerAuthorizedView,
    activeManagerAuthorizedSharedAccounts:
      SharedAccountsContract.activeManagerAuthorizedView,
    activeSharedAccountCustomerAuthorizations:
      SharedAccountCustomerAuthorizationsContract.activeView,
    activeAuthorizedSharedAccountCustomerAuthorizations:
      SharedAccountCustomerAuthorizationsContract.activeAuthorizedView,
    activeSharedAccountManagerAuthorizations:
      SharedAccountManagerAuthorizationsContract.activeView,
    activeAuthorizedSharedAccountManagerAuthorizations:
      SharedAccountManagerAuthorizationsContract.activeAuthorizedView,
    activeCustomerAuthorizedSharedAccountManagerAuthorizations:
      SharedAccountManagerAuthorizationsContract.activeCustomerAuthorizedView,
    activeComments: CommentsContract.activeView,
    activeManagerAuthorizedSharedAccountOrderComments:
      CommentsContract.activeManagerAuthorizedSharedAccountOrderView,
    activeCustomerPlacedOrderComments:
      CommentsContract.activeCustomerPlacedOrderView,
    activeDeliveryOptions: DeliveryOptionsContract.activeView,
    activePublishedRoomDeliveryOptions:
      DeliveryOptionsContract.activePublishedRoomView,
    activeInvoices: InvoicesContract.activeView,
    activeManagerAuthorizedSharedAccountOrderInvoices:
      InvoicesContract.activeManagerAuthorizedSharedAccountOrderView,
    activeCustomerPlacedOrderInvoices:
      InvoicesContract.activeCustomerPlacedOrderView,
    activeOrders: OrdersContract.activeView,
    activeManagerAuthorizedSharedAccountOrders:
      OrdersContract.activeManagerAuthorizedSharedAccountView,
    activeCustomerPlacedOrders: OrdersContract.activeCustomerPlacedView,
    activeProducts: ProductsContract.activeView,
    activePublishedProducts: ProductsContract.activePublishedView,
    activeRooms: RoomsContract.activeView,
    activePublishedRooms: RoomsContract.activePublishedView,
    activeUsers: UsersContract.activeView,
    activeRoomWorkflows: RoomWorkflowsContract.activeView,
    activePublishedRoomWorkflows: RoomWorkflowsContract.activePublishedRoomView,
    activeSharedAccountWorkflows: SharedAccountWorkflowsContract.activeView,
    activeCustomerAuthorizedSharedAccountWorkflows:
      SharedAccountWorkflowsContract.activeCustomerAuthorizedView,
    activeManagerAuthorizedSharedAccountWorkflows:
      SharedAccountWorkflowsContract.activeManagerAuthorizedView,
    activeWorkflowStatuses: WorkflowStatusesContract.activeView,
    activePublishedRoomWorkflowStatuses:
      WorkflowStatusesContract.activePublishedRoomView,
    activeCustomerAuthorizedSharedAccountWorkflowStatuses:
      WorkflowStatusesContract.activeCustomerAuthorizedSharedAccountView,
    activeManagerAuthorizedSharedAccountWorkflowStatuses:
      WorkflowStatusesContract.activeManagerAuthorizedSharedAccountView,
  };
  export class Views extends Effect.Service<Views>()(
    "@printdesk/core/models/Views",
    { accessors: true, effect: Effect.all(views) },
  ) {}
  export type View = Views[keyof Omit<Views, "_tag">];
  export type ViewName = View["name"];
  export type ViewByName<TName extends ViewName> = Extract<
    View,
    { name: TName }
  >;
}
