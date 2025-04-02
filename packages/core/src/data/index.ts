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
  .query(announcementsTableName, Announcements.read)
  .query(billingAccountsTableName, BillingAccounts.read)
  .query(
    billingAccountCustomerAuthorizationsTableName,
    BillingAccounts.readCustomerAuthorizations,
  )
  .query(
    billingAccountManagerAuthorizationsTableName,
    BillingAccounts.readManagerAuthorizations,
  )
  .query(commentsTableName, Comments.read)
  .query(deliveryOptionsTableName, Rooms.readDeliveryOptions)
  .query(invoicesTableName, Invoices.read)
  .query(ordersTableName, Orders.read)
  .query(productsTableName, Products.read)
  .query(roomsTableName, Rooms.read)
  .query(tenantsTableName, Tenants.read)
  .query(usersTableName, Users.read)
  .query(workflowStatusesTableName, Rooms.readWorkflow);
