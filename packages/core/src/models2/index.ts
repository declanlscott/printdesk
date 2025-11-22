import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Record from "effect/Record";
import * as Tuple from "effect/Tuple";

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
  SharedAccountCustomerAccessContract,
  SharedAccountManagerAccessContract,
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
  const record = <
    TTables extends
      | typeof syncTables
      | typeof nonSyncTables
      | typeof internalTables
      | typeof syncViews,
  >(
    tables: TTables,
  ) =>
    Record.fromEntries(
      Tuple.map(tables, (table) => Tuple.make(table.name, table)),
    ) as {
      [TName in TTables[number]["name"]]: Extract<
        TTables[number],
        { name: TName }
      >;
    };

  export const syncTables = Array.make(
    AnnouncementsContract.table,
    CommentsContract.table,
    DeliveryOptionsContract.table,
    GroupsContract.table,
    InvoicesContract.table,
    OrdersContract.table,
    ProductsContract.table,
    RoomsContract.table,
    SharedAccountsContract.table,
    SharedAccountCustomerAccessContract.table,
    SharedAccountManagerAccessContract.table,
    TenantsContract.table,
    UsersContract.table,
    RoomWorkflowsContract.table,
    SharedAccountWorkflowsContract.table,
    WorkflowStatusesContract.table,
  );
  export const syncTablesRecord = record(syncTables);
  export class SyncTables extends Effect.Service<SyncTables>()(
    "@printdesk/core/models/SyncTables",
    { accessors: true, effect: Effect.all(syncTablesRecord) },
  ) {}
  export type SyncTable = SyncTables[keyof Omit<SyncTables, "_tag">];
  export type SyncTableName = SyncTable["name"];
  export type SyncTableByName<TName extends SyncTableName> = Extract<
    SyncTable,
    { name: TName }
  >;

  export const nonSyncTables = Array.make(IdentityProvidersContract.table);
  export const nonSyncTablesRecord = record(nonSyncTables);
  export class NonSyncTables extends Effect.Service<NonSyncTables>()(
    "@printdesk/core/models/NonSyncTables",
    { accessors: true, effect: Effect.all(nonSyncTablesRecord) },
  ) {}
  export type NonSyncTable = NonSyncTables[keyof Omit<NonSyncTables, "_tag">];
  export type NonSyncTableName = NonSyncTable["name"];
  export type NonSyncTableByName<TName extends NonSyncTableName> = Extract<
    NonSyncTable,
    { name: TName }
  >;

  export const internalTables = Array.make(
    IdentityProviderUserGroupsContract.table,
    LicensesContract.table,
    TenantMetadataContract.table,
  );
  export const internalTablesRecord = record(internalTables);
  export class InternalTables extends Effect.Service<InternalTables>()(
    "@printdesk/core/models/InternalTables",
    { accessors: true, effect: Effect.all(internalTablesRecord) },
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

  export const syncViews = Array.make(
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
    CommentsContract.activeView,
    CommentsContract.activeManagerAuthorizedSharedAccountOrderView,
    CommentsContract.activeCustomerPlacedOrderView,
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
  export const syncViewsRecord = record(syncViews);
  export class SyncViews extends Effect.Service<SyncViews>()(
    "@printdesk/core/models/SyncViews",
    { accessors: true, effect: Effect.all(syncViewsRecord) },
  ) {}
  export type SyncView = SyncViews[keyof Omit<SyncViews, "_tag">];
  export type SyncViewName = SyncView["name"];
  export type SyncViewByName<TName extends SyncViewName> = Extract<
    SyncView,
    { name: TName }
  >;
}
