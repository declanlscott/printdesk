import { getTableName } from "drizzle-orm";

import { Announcements } from "../announcements";
import { announcementsTable } from "../announcements/sql";
import { BillingAccounts } from "../billing-accounts";
import {
  billingAccountCustomerAuthorizationsTable,
  billingAccountManagerAuthorizationsTable,
  billingAccountsTable,
} from "../billing-accounts/sql";
import { Comments } from "../comments";
import { commentsTable } from "../comments/sql";
import { Invoices } from "../invoices";
import { invoicesTable } from "../invoices/sql";
import { Orders } from "../orders";
import { ordersTable } from "../orders/sql";
import { Products } from "../products";
import { productsTable } from "../products/sql";
import { replicacheClientsTable } from "../replicache/sql";
import { Rooms } from "../rooms";
import {
  deliveryOptionsTable,
  roomsTable,
  workflowStatusesTable,
} from "../rooms/sql";
import { Tenants } from "../tenants";
import { tenantsTable } from "../tenants/sql";
import { Users } from "../users";
import { usersTable } from "../users/sql";

import type { InferSelectModel } from "drizzle-orm";
import type * as v from "valibot";

export const syncedTables = [
  announcementsTable,
  billingAccountsTable,
  billingAccountCustomerAuthorizationsTable,
  billingAccountManagerAuthorizationsTable,
  commentsTable,
  deliveryOptionsTable,
  invoicesTable,
  ordersTable,
  productsTable,
  roomsTable,
  tenantsTable,
  usersTable,
  workflowStatusesTable,
];
export const nonSyncedTables = [replicacheClientsTable];
export const tables = [...syncedTables, ...nonSyncedTables];

export type SyncedTable = (typeof syncedTables)[number];
export type NonSyncedTable = (typeof nonSyncedTables)[number];
export type Table = SyncedTable | NonSyncedTable;

export type SyncedTableName = SyncedTable["_"]["name"];
export type NonSyncedTableName = NonSyncedTable["_"]["name"];
export type TableName = Table["_"]["name"];

export type TableByName<TTableName extends TableName> = Extract<
  Table,
  { _: { name: TTableName } }
>;

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

export type TablePatchData<TTable extends SyncedTable> = {
  puts: Array<InferSelectModel<TTable>>;
  dels: Array<InferSelectModel<TTable>["id"]>;
};

export type TableData = [
  SyncedTableName,
  TablePatchData<TableByName<SyncedTableName>>,
];

export interface Command<
  TName extends string = string,
  TSchema extends v.GenericSchema = v.AnySchema,
> {
  name: TName;
  schema: TSchema;
  input: v.InferInput<TSchema>;
}

export class CommandRepository<
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  TCommands extends Record<string, Command<string, v.GenericSchema>> = {},
> {
  private _commands = new Map<
    string,
    {
      fn: (input: unknown) => Promise<void>;
      schema: v.GenericSchema;
    }
  >();

  public command<TName extends string, TSchema extends v.GenericSchema>(
    name: TName,
    fn: ((input: v.InferInput<TSchema>) => Promise<void>) & {
      schema: TSchema;
    },
  ) {
    this._commands.set(name, {
      fn,
      schema: fn.schema,
    });

    return this as CommandRepository<
      TCommands & Record<TName, Command<TName, TSchema>>
    >;
  }

  public dispatch<TName extends keyof TCommands & string>(
    name: TName,
    input: TCommands[TName]["input"],
  ) {
    const command = this._commands.get(name);
    if (!command) throw new Error(`Command "${name}" not found`);

    return command.fn(input);
  }

  public names() {
    return Array.from(this._commands.keys()) as Array<keyof TCommands & string>;
  }
}

/**
 * A collection of authoritative mutators for Replicache. This should match the corresponding client-side mutators.
 */
export const commandRepository = new CommandRepository()
  .command("createAnnouncement", Announcements.create)
  .command("updateAnnouncement", Announcements.update)
  .command("deleteAnnouncement", Announcements.delete_)
  .command(
    "updateBillingAccountReviewThreshold",
    BillingAccounts.updateReviewThreshold,
  )
  .command("deleteBillingAccount", BillingAccounts.delete_)
  .command(
    "createBillingAccountManagerAuthorization",
    BillingAccounts.createManagerAuthorization,
  )
  .command(
    "deleteBillingAccountManagerAuthorization",
    BillingAccounts.deleteManagerAuthorization,
  )
  .command("createComment", Comments.create)
  .command("updateComment", Comments.update)
  .command("deleteComment", Comments.delete_)
  .command("setDeliveryOptions", Rooms.setDeliveryOptions)
  .command("createInvoice", Invoices.create)
  .command("createOrder", Orders.create)
  .command("updateOrder", Orders.update)
  .command("deleteOrder", Orders.delete_)
  .command("createProduct", Products.create)
  .command("updateProduct", Products.update)
  .command("deleteProduct", Products.delete_)
  .command("createRoom", Rooms.create)
  .command("updateRoom", Rooms.update)
  .command("deleteRoom", Rooms.delete_)
  .command("restoreRoom", Rooms.restore)
  .command("updateTenant", Tenants.update)
  .command("updateUserRole", Users.updateRole)
  .command("deleteUser", Users.delete_)
  .command("restoreUser", Users.restore)
  .command("setWorkflow", Rooms.setWorkflow);

export type Query<TSyncedTableName extends SyncedTableName> = (
  ids: Array<InferSelectModel<TableByName<TSyncedTableName>>["id"]>,
) => Promise<Array<InferSelectModel<TableByName<TSyncedTableName>>>>;

export class QueryRepository<
  TQueries extends {
    [TTableName in SyncedTableName]?: Query<TTableName>;
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  } = {},
> {
  private _queries = new Map<SyncedTableName, Query<SyncedTableName>>();

  public query<TTableName extends SyncedTableName>(
    name: TTableName,
    fn: TTableName extends SyncedTableName ? Query<TTableName> : never,
  ) {
    this._queries.set(name, fn);

    return this as QueryRepository<
      TQueries & Record<TTableName, Query<TTableName>>
    >;
  }

  public dispatch<TTableName extends SyncedTableName>(
    this: TQueries extends {
      [TTableName in SyncedTableName]: Query<TTableName>;
    }
      ? QueryRepository<TQueries>
      : never,
    name: TTableName,
    ids: TTableName extends SyncedTableName
      ? Array<InferSelectModel<TableByName<TTableName>>["id"]>
      : never,
  ) {
    const query = this._queries.get(name);
    if (!query) throw new Error(`Query "${name}" not found`);

    return query(ids) as Promise<
      Array<InferSelectModel<TableByName<TTableName>>>
    >;
  }
}

/**
 * A collection of queries for Replicache.
 */
export const queryRepository = new QueryRepository()
  .query(getTableName(announcementsTable), Announcements.read)
  .query(getTableName(billingAccountsTable), BillingAccounts.read)
  .query(
    getTableName(billingAccountCustomerAuthorizationsTable),
    BillingAccounts.readCustomerAuthorizations,
  )
  .query(
    getTableName(billingAccountManagerAuthorizationsTable),
    BillingAccounts.readManagerAuthorizations,
  )
  .query(getTableName(commentsTable), Comments.read)
  .query(getTableName(deliveryOptionsTable), Rooms.readDeliveryOptions)
  .query(getTableName(invoicesTable), Invoices.read)
  .query(getTableName(ordersTable), Orders.read)
  .query(getTableName(productsTable), Products.read)
  .query(getTableName(roomsTable), Rooms.read)
  .query(getTableName(tenantsTable), Tenants.read)
  .query(getTableName(usersTable), Users.read)
  .query(getTableName(workflowStatusesTable), Rooms.readWorkflow);
