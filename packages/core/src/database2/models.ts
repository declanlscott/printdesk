/**
 * Exports every database model excluding replicache's since it depends on the sync tables.
 */

import { Array } from "effect";

import { AnnouncementsContract } from "../announcements2/contract";
import {
  BillingAccountCustomerAuthorizationsContract,
  BillingAccountManagerAuthorizationsContract,
  BillingAccountsContract,
} from "../billing-accounts2/contracts";
import { CommentsContract } from "../comments2/contract";
import {
  IdentityProviderGroupsContract,
  IdentityProvidersContract,
} from "../identity-providers2/contract";
import { InvoicesContract } from "../invoices2/contract";
import { OrdersContract } from "../orders2/contract";
import { ProductsContract } from "../products2/contract";
import {
  DeliveryOptionsContract,
  RoomsContract,
  WorkflowsContract,
} from "../rooms2/contracts";
import {
  LicensesContract,
  TenantMetadataContract,
  TenantsContract,
} from "../tenants2/contracts";
import { UsersContract } from "../users2/contract";

export const models = Array.make(
  AnnouncementsContract.table,
  AnnouncementsContract.activeView,
  BillingAccountsContract.table,
  BillingAccountsContract.activeView,
  BillingAccountCustomerAuthorizationsContract.table,
  BillingAccountCustomerAuthorizationsContract.activeView,
  BillingAccountManagerAuthorizationsContract.table,
  BillingAccountManagerAuthorizationsContract.activeView,
  CommentsContract.table,
  CommentsContract.activeView,
  DeliveryOptionsContract.table,
  DeliveryOptionsContract.activePublishedRoomView,
  IdentityProvidersContract.table,
  IdentityProviderGroupsContract.table,
  InvoicesContract.table,
  InvoicesContract.activeView,
  LicensesContract.table,
  OrdersContract.table,
  OrdersContract.activeView,
  ProductsContract.table,
  ProductsContract.activeView,
  ProductsContract.activePublishedView,
  RoomsContract.table,
  RoomsContract.activeView,
  RoomsContract.activePublishedView,
  TenantsContract.table,
  TenantMetadataContract.table,
  UsersContract.table,
  UsersContract.activeView,
  WorkflowsContract.table,
  WorkflowsContract.activePublishedRoomView,
);
