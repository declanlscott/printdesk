import { Announcements } from "../announcements";
import { announcementsTableName } from "../announcements/shared";
import { BillingAccounts } from "../billing-accounts";
import {
  billingAccountCustomerAuthorizationsTableName,
  billingAccountManagerAuthorizationsTableName,
  billingAccountsTableName,
} from "../billing-accounts/shared";
import { Comments } from "../comments";
import { commentsTableName } from "../comments/shared";
import { Invoices } from "../invoices";
import { invoicesTableName } from "../invoices/shared";
import { Orders } from "../orders";
import { ordersTableName } from "../orders/shared";
import { Products } from "../products";
import { productsTableName } from "../products/shared";
import { Rooms } from "../rooms";
import {
  deliveryOptionsTableName,
  roomsTableName,
  workflowStatusesTableName,
} from "../rooms/shared";
import { Tenants } from "../tenants";
import { tenantsTableName } from "../tenants/shared";
import { Users } from "../users";
import { usersTableName } from "../users/shared";

import type { InferSelectModel } from "drizzle-orm";
import type * as v from "valibot";
import type {
  NonSyncedTableName,
  SyncedTable,
  SyncedTableName,
  Table,
  TableByName,
  TableName,
} from "../utils/tables";
import type { MutationName } from "./shared";

export type Metadata<TTable extends Table = TableByName<TableName>> = {
  id: NonNullable<InferSelectModel<TTable>["id"]>;
  version: number;
};

export type SyncedTableMetadata = [
  SyncedTableName,
  Array<Metadata<TableByName<SyncedTableName>>>,
];
export type NonSyncedTableMetadata = [
  NonSyncedTableName,
  Array<Metadata<TableByName<NonSyncedTableName>>>,
];
export type TableMetadata = [
  TableName,
  Array<Metadata<TableByName<TableName>>>,
];

export type Query<TSyncedTableName extends SyncedTableName> = (
  ids: Array<InferSelectModel<TableByName<TSyncedTableName>>["id"]>,
) => Promise<Array<InferSelectModel<TableByName<TSyncedTableName>>>>;

export type QueryRepository = {
  [TName in SyncedTableName]: Query<TName>;
};

/**
 * A collection of queries for Replicache.
 */
export const queryRepository = {
  [announcementsTableName]: Announcements.read,
  [billingAccountsTableName]: BillingAccounts.read,
  [billingAccountCustomerAuthorizationsTableName]:
    BillingAccounts.readCustomerAuthorizations,
  [billingAccountManagerAuthorizationsTableName]:
    BillingAccounts.readManagerAuthorizations,
  [commentsTableName]: Comments.read,
  [deliveryOptionsTableName]: Rooms.readDeliveryOptions,
  [invoicesTableName]: Invoices.read,
  [ordersTableName]: Orders.read,
  [productsTableName]: Products.read,
  [roomsTableName]: Rooms.read,
  [tenantsTableName]: Tenants.read,
  [usersTableName]: Users.read,
  [workflowStatusesTableName]: Rooms.readWorkflow,
} satisfies QueryRepository;

export type TablePatchData<TTable extends SyncedTable> = {
  puts: Array<InferSelectModel<TTable>>;
  dels: Array<InferSelectModel<TTable>["id"]>;
};

export type TableData = [
  SyncedTableName,
  TablePatchData<TableByName<SyncedTableName>>,
];

export type Command = <TSchema extends v.GenericSchema>(
  args: v.InferOutput<TSchema>,
) => Promise<void>;

export type CommandRepository = Record<MutationName, Command>;

/**
 * A collection of authoritative mutators for Replicache. This should match the corresponding client-side mutators.
 */
export const commandRepository = {
  createAnnouncement: Announcements.create,
  updateAnnouncement: Announcements.update,
  deleteAnnouncement: Announcements.delete_,
  updateBillingAccountReviewThreshold: BillingAccounts.updateReviewThreshold,
  deleteBillingAccount: BillingAccounts.delete_,
  createBillingAccountManagerAuthorization:
    BillingAccounts.createManagerAuthorization,
  deleteBillingAccountManagerAuthorization:
    BillingAccounts.deleteManagerAuthorization,
  createComment: Comments.create,
  updateComment: Comments.update,
  deleteComment: Comments.delete_,
  setDeliveryOptions: Rooms.setDeliveryOptions,
  createInvoice: Invoices.create,
  createOrder: Orders.create,
  updateOrder: Orders.update,
  deleteOrder: Orders.delete_,
  createProduct: Products.create,
  updateProduct: Products.update,
  deleteProduct: Products.delete_,
  createRoom: Rooms.create,
  updateRoom: Rooms.update,
  deleteRoom: Rooms.delete_,
  restoreRoom: Rooms.restore,
  updateTenant: Tenants.update,
  updateUserRole: Users.updateRole,
  deleteUser: Users.delete_,
  restoreUser: Users.restore,
  setWorkflow: Rooms.setWorkflow,
} satisfies CommandRepository;
