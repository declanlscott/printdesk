import { and, arrayOverlaps, eq, isNull, or } from "drizzle-orm";

import { announcementsTable } from "../announcements/sql";
import {
  billingAccountCustomerAuthorizationsTable,
  billingAccountManagerAuthorizationsTable,
  billingAccountsTable,
} from "../billing-accounts/sql";
import { commentsTable } from "../comments/sql";
import { getRowVersionColumn } from "../drizzle/columns";
import { useTransaction } from "../drizzle/context";
import { invoicesTable } from "../invoices/sql";
import { ordersTableName } from "../orders/shared";
import { ordersTable } from "../orders/sql";
import { productsTable } from "../products/sql";
import {
  deliveryOptionsTable,
  roomsTable,
  workflowStatusesTable,
} from "../rooms/sql";
import { useTenant } from "../tenants/context";
import { tenantsTable } from "../tenants/sql";
import { useUser } from "../users/context";
import { userProfilesTable, usersTable } from "../users/sql";

import type { SQL } from "drizzle-orm";
import type { PgSelectBase } from "drizzle-orm/pg-core";
import type { BillingAccount } from "../billing-accounts/sql";
import type { Comment } from "../comments/sql";
import type { TxOrDb } from "../drizzle/context";
import type { Order } from "../orders/sql";
import type { Metadata } from "../replicache/data";
import type { UserRole } from "../users/shared";
import type { User } from "../users/sql";
import type { SyncedTableName, TableByName } from "../utils/tables";
import type { AnyError, CustomError, InferCustomError } from "../utils/types";
import type { Action, Resource } from "./shared";

export namespace AccessControl {
  type SyncedTableResourceMetadataBaseQuery = {
    [TName in SyncedTableName]: (tx: TxOrDb) => PgSelectBase<
      TName,
      {
        id: TableByName<TName>["_"]["columns"]["id"];
        rowVersion: SQL<number>;
      },
      "partial",
      Record<TName, "not-null">,
      true
    >;
  };

  const syncedTableResourceMetadataBaseQuery = {
    [announcementsTable._.name]: (tx) =>
      tx
        .select({
          id: announcementsTable.id,
          rowVersion: getRowVersionColumn(announcementsTable._.name),
        })
        .from(announcementsTable)
        .where(eq(announcementsTable.tenantId, useTenant().id))
        .$dynamic(),
    [billingAccountsTable._.name]: (tx) =>
      tx
        .select({
          id: billingAccountsTable.id,
          rowVersion: getRowVersionColumn(billingAccountsTable._.name),
        })
        .from(billingAccountsTable)
        .where(eq(billingAccountsTable.tenantId, useTenant().id))
        .$dynamic(),
    [billingAccountCustomerAuthorizationsTable._.name]: (tx) =>
      tx
        .select({
          id: billingAccountCustomerAuthorizationsTable.id,
          rowVersion: getRowVersionColumn(
            billingAccountCustomerAuthorizationsTable._.name,
          ),
        })
        .from(billingAccountCustomerAuthorizationsTable)
        .where(
          eq(
            billingAccountCustomerAuthorizationsTable.tenantId,
            useTenant().id,
          ),
        )
        .$dynamic(),
    [billingAccountManagerAuthorizationsTable._.name]: (tx) =>
      tx
        .select({
          id: billingAccountManagerAuthorizationsTable.id,
          rowVersion: getRowVersionColumn(
            billingAccountManagerAuthorizationsTable._.name,
          ),
        })
        .from(billingAccountManagerAuthorizationsTable)
        .where(
          eq(billingAccountManagerAuthorizationsTable.tenantId, useTenant().id),
        )
        .$dynamic(),
    [commentsTable._.name]: (tx) =>
      tx
        .select({
          id: commentsTable.id,
          rowVersion: getRowVersionColumn(commentsTable._.name),
        })
        .from(commentsTable)
        .where(eq(commentsTable.tenantId, useTenant().id))
        .$dynamic(),
    [deliveryOptionsTable._.name]: (tx) =>
      tx
        .select({
          id: deliveryOptionsTable.id,
          rowVersion: getRowVersionColumn(deliveryOptionsTable._.name),
        })
        .from(deliveryOptionsTable)
        .where(eq(deliveryOptionsTable.tenantId, useTenant().id))
        .$dynamic(),
    [invoicesTable._.name]: (tx) =>
      tx
        .select({
          id: invoicesTable.id,
          rowVersion: getRowVersionColumn(invoicesTable._.name),
        })
        .from(invoicesTable)
        .where(eq(invoicesTable.tenantId, useTenant().id))
        .$dynamic(),
    [ordersTable._.name]: (tx) =>
      tx
        .select({
          id: ordersTable.id,
          rowVersion: getRowVersionColumn(ordersTable._.name),
        })
        .from(ordersTable)
        .where(
          and(
            eq(ordersTable.tenantId, useTenant().id),
            isNull(ordersTable.deletedAt),
          ),
        )
        .$dynamic(),
    [productsTable._.name]: (tx) =>
      tx
        .select({
          id: productsTable.id,
          rowVersion: getRowVersionColumn(productsTable._.name),
        })
        .from(productsTable)
        .where(eq(productsTable.tenantId, useTenant().id))
        .$dynamic(),
    [roomsTable._.name]: (tx) =>
      tx
        .select({
          id: roomsTable.id,
          rowVersion: getRowVersionColumn(roomsTable._.name),
        })
        .from(roomsTable)
        .where(eq(roomsTable.tenantId, useTenant().id))
        .$dynamic(),
    [tenantsTable._.name]: (tx) =>
      tx
        .select({
          id: tenantsTable.id,
          rowVersion: getRowVersionColumn(tenantsTable._.name),
        })
        .from(tenantsTable)
        .where(eq(tenantsTable.id, useTenant().id))
        .$dynamic(),
    [usersTable._.name]: (tx) =>
      tx
        .select({
          id: usersTable.id,
          rowVersion: getRowVersionColumn(usersTable._.name),
        })
        .from(usersTable)
        .innerJoin(
          userProfilesTable,
          and(
            eq(usersTable.id, userProfilesTable.userId),
            eq(usersTable.tenantId, userProfilesTable.tenantId),
          ),
        )
        .where(
          and(
            eq(usersTable.tenantId, useTenant().id),
            isNull(usersTable.deletedAt),
          ),
        )
        .$dynamic(),
    [workflowStatusesTable._.name]: (tx) =>
      tx
        .select({
          id: workflowStatusesTable.id,
          rowVersion: getRowVersionColumn(workflowStatusesTable._.name),
        })
        .from(workflowStatusesTable)
        .where(and(eq(workflowStatusesTable.tenantId, useTenant().id)))
        .$dynamic(),
  } as const satisfies SyncedTableResourceMetadataBaseQuery;

  export type SyncedTableResourceMetadata = Record<
    UserRole,
    {
      [TName in SyncedTableName]: () => Promise<
        Array<Metadata<TableByName<TName>>>
      >;
    }
  >;

  export const syncedTableResourceMetadata = {
    administrator: {
      [announcementsTable._.name]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[announcementsTable._.name],
        ),
      [billingAccountsTable._.name]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[billingAccountsTable._.name],
        ),
      [billingAccountCustomerAuthorizationsTable._.name]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[
            billingAccountCustomerAuthorizationsTable._.name
          ],
        ),
      [billingAccountManagerAuthorizationsTable._.name]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[
            billingAccountManagerAuthorizationsTable._.name
          ],
        ),
      [commentsTable._.name]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[commentsTable._.name],
        ),
      [deliveryOptionsTable._.name]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[deliveryOptionsTable._.name],
        ),
      [invoicesTable._.name]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[invoicesTable._.name],
        ),
      [ordersTable._.name]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[ordersTable._.name],
        ),
      [productsTable._.name]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[productsTable._.name],
        ),
      [roomsTable._.name]: async () =>
        useTransaction(syncedTableResourceMetadataBaseQuery[roomsTable._.name]),
      [tenantsTable._.name]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[tenantsTable._.name],
        ),
      [usersTable._.name]: async () =>
        useTransaction(syncedTableResourceMetadataBaseQuery[usersTable._.name]),
      [workflowStatusesTable._.name]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[workflowStatusesTable._.name],
        ),
    },
    operator: {
      [announcementsTable._.name]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[announcementsTable._.name],
        ),
      [billingAccountsTable._.name]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[billingAccountsTable._.name](
            tx,
          ).where(isNull(billingAccountsTable.deletedAt)),
        ),
      [billingAccountCustomerAuthorizationsTable._.name]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[
            billingAccountCustomerAuthorizationsTable._.name
          ](tx).where(
            isNull(billingAccountCustomerAuthorizationsTable.deletedAt),
          ),
        ),
      [billingAccountManagerAuthorizationsTable._.name]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[
            billingAccountManagerAuthorizationsTable._.name
          ](tx).where(
            isNull(billingAccountManagerAuthorizationsTable.deletedAt),
          ),
        ),
      [commentsTable._.name]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[commentsTable._.name](tx).where(
            and(
              arrayOverlaps(commentsTable.visibleTo, [
                "operator",
                "manager",
                "customer",
              ]),
              isNull(commentsTable.deletedAt),
            ),
          ),
        ),
      [deliveryOptionsTable._.name]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[deliveryOptionsTable._.name](
            tx,
          ).where(isNull(roomsTable.deletedAt)),
        ),
      [invoicesTable._.name]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[invoicesTable._.name](tx).where(
            isNull(invoicesTable.deletedAt),
          ),
        ),
      [ordersTable._.name]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[ordersTableName](tx).where(
            isNull(ordersTable.deletedAt),
          ),
        ),
      [productsTable._.name]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[productsTable._.name](tx).where(
            isNull(productsTable.deletedAt),
          ),
        ),
      [roomsTable._.name]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[roomsTable._.name](tx).where(
            isNull(roomsTable.deletedAt),
          ),
        ),
      [tenantsTable._.name]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[tenantsTable._.name],
        ),
      [usersTable._.name]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[usersTable._.name](tx).where(
            isNull(userProfilesTable.deletedAt),
          ),
        ),
      [workflowStatusesTable._.name]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[workflowStatusesTable._.name],
        ),
    },
    manager: {
      [announcementsTable._.name]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[announcementsTable._.name],
        ),
      [billingAccountsTable._.name]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[billingAccountsTable._.name](
            tx,
          ).where(isNull(billingAccountsTable.deletedAt)),
        ),
      [billingAccountCustomerAuthorizationsTable._.name]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[
            billingAccountCustomerAuthorizationsTable._.name
          ](tx).where(
            isNull(billingAccountCustomerAuthorizationsTable.deletedAt),
          ),
        ),
      [billingAccountManagerAuthorizationsTable._.name]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[
            billingAccountManagerAuthorizationsTable._.name
          ](tx).where(
            isNull(billingAccountManagerAuthorizationsTable.deletedAt),
          ),
        ),
      [commentsTable._.name]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[commentsTable._.name](tx)
            .innerJoin(
              ordersTable,
              and(
                eq(commentsTable.orderId, ordersTable.id),
                eq(commentsTable.tenantId, ordersTable.tenantId),
              ),
            )
            .innerJoin(
              billingAccountsTable,
              and(
                eq(ordersTable.billingAccountId, billingAccountsTable.id),
                eq(ordersTable.tenantId, billingAccountsTable.tenantId),
              ),
            )
            .innerJoin(
              billingAccountManagerAuthorizationsTable,
              and(
                eq(
                  billingAccountsTable.id,
                  billingAccountManagerAuthorizationsTable.billingAccountId,
                ),
                eq(
                  billingAccountsTable.tenantId,
                  billingAccountManagerAuthorizationsTable.tenantId,
                ),
              ),
            )
            .where(
              and(
                arrayOverlaps(commentsTable.visibleTo, ["manager", "customer"]),
                isNull(commentsTable.deletedAt),
              ),
            ),
        ),
      [deliveryOptionsTable._.name]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[deliveryOptionsTable._.name](
            tx,
          ).where(
            and(
              eq(roomsTable.status, "published"),
              isNull(roomsTable.deletedAt),
            ),
          ),
        ),
      [invoicesTable._.name]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[invoicesTable._.name](tx)
            .innerJoin(
              ordersTable,
              and(
                eq(invoicesTable.orderId, ordersTable.id),
                eq(invoicesTable.tenantId, ordersTable.tenantId),
              ),
            )
            .innerJoin(
              billingAccountsTable,
              and(
                eq(ordersTable.billingAccountId, billingAccountsTable.id),
                eq(ordersTable.tenantId, billingAccountsTable.tenantId),
              ),
            )
            .innerJoin(
              billingAccountManagerAuthorizationsTable,
              and(
                eq(
                  billingAccountsTable.id,
                  billingAccountManagerAuthorizationsTable.billingAccountId,
                ),
                eq(
                  billingAccountsTable.tenantId,
                  billingAccountManagerAuthorizationsTable.tenantId,
                ),
              ),
            )
            .where(
              or(
                isNull(invoicesTable.deletedAt),
                and(
                  eq(ordersTable.customerId, useUser().id),
                  isNull(invoicesTable.deletedAt),
                ),
              ),
            ),
        ),
      [ordersTable._.name]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[ordersTable._.name](tx)
            .innerJoin(
              billingAccountsTable,
              and(
                eq(ordersTable.billingAccountId, billingAccountsTable.id),
                eq(ordersTable.tenantId, billingAccountsTable.tenantId),
              ),
            )
            .innerJoin(
              billingAccountManagerAuthorizationsTable,
              and(
                eq(
                  billingAccountsTable.id,
                  billingAccountManagerAuthorizationsTable.billingAccountId,
                ),
                eq(
                  billingAccountsTable.tenantId,
                  billingAccountManagerAuthorizationsTable.tenantId,
                ),
              ),
            )
            .where(
              or(
                isNull(ordersTable.deletedAt),
                and(
                  eq(ordersTable.customerId, useUser().id),
                  isNull(ordersTable.deletedAt),
                ),
              ),
            ),
        ),
      [productsTable._.name]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[productsTable._.name](tx).where(
            and(
              eq(productsTable.status, "published"),
              isNull(productsTable.deletedAt),
            ),
          ),
        ),
      [roomsTable._.name]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[roomsTable._.name](tx).where(
            and(
              eq(roomsTable.status, "published"),
              isNull(roomsTable.deletedAt),
            ),
          ),
        ),
      [tenantsTable._.name]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[tenantsTable._.name],
        ),
      [usersTable._.name]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[usersTable._.name](tx).where(
            isNull(userProfilesTable.deletedAt),
          ),
        ),
      [workflowStatusesTable._.name]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[workflowStatusesTable._.name],
        ),
    },
    customer: {
      [announcementsTable._.name]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[announcementsTable._.name],
        ),
      [billingAccountsTable._.name]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[billingAccountsTable._.name](
            tx,
          ).where(isNull(billingAccountsTable.deletedAt)),
        ),
      [billingAccountCustomerAuthorizationsTable._.name]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[
            billingAccountCustomerAuthorizationsTable._.name
          ](tx).where(
            isNull(billingAccountCustomerAuthorizationsTable.deletedAt),
          ),
        ),
      [billingAccountManagerAuthorizationsTable._.name]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[
            billingAccountManagerAuthorizationsTable._.name
          ](tx).where(
            isNull(billingAccountManagerAuthorizationsTable.deletedAt),
          ),
        ),
      [commentsTable._.name]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[commentsTable._.name](tx)
            .innerJoin(
              ordersTable,
              and(
                eq(commentsTable.orderId, ordersTable.id),
                eq(commentsTable.tenantId, ordersTable.tenantId),
              ),
            )
            .where(
              and(
                eq(ordersTable.customerId, useUser().id),
                arrayOverlaps(commentsTable.visibleTo, ["customer"]),
                isNull(commentsTable.deletedAt),
              ),
            ),
        ),
      [deliveryOptionsTable._.name]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[deliveryOptionsTable._.name](
            tx,
          ).where(
            and(
              eq(roomsTable.status, "published"),
              isNull(roomsTable.deletedAt),
            ),
          ),
        ),
      [invoicesTable._.name]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[invoicesTable._.name](tx)
            .innerJoin(
              ordersTable,
              and(
                eq(invoicesTable.orderId, ordersTable.id),
                eq(invoicesTable.tenantId, ordersTable.tenantId),
              ),
            )
            .where(
              and(
                eq(ordersTable.customerId, useUser().id),
                isNull(invoicesTable.deletedAt),
              ),
            ),
        ),
      [ordersTable._.name]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[ordersTable._.name](tx).where(
            and(
              eq(ordersTable.customerId, useUser().id),
              isNull(ordersTable.deletedAt),
            ),
          ),
        ),
      [productsTable._.name]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[productsTable._.name](tx).where(
            and(
              eq(productsTable.status, "published"),
              isNull(productsTable.deletedAt),
            ),
          ),
        ),
      [roomsTable._.name]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[roomsTable._.name](tx).where(
            and(
              eq(roomsTable.status, "published"),
              isNull(roomsTable.deletedAt),
            ),
          ),
        ),
      [tenantsTable._.name]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[tenantsTable._.name],
        ),
      [usersTable._.name]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[usersTable._.name](tx).where(
            isNull(userProfilesTable.deletedAt),
          ),
        ),
      [workflowStatusesTable._.name]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[workflowStatusesTable._.name],
        ),
    },
  } as const satisfies SyncedTableResourceMetadata;

  type Permissions = Record<
    UserRole,
    Record<
      Resource,
      Record<
        Action,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        boolean | ((...input: Array<any>) => boolean | Promise<boolean>)
      >
    >
  >;

  export const permissions = {
    administrator: {
      [announcementsTable._.name]: {
        create: true,
        update: true,
        delete: true,
      },
      [billingAccountsTable._.name]: {
        create: false,
        update: true,
        delete: true,
      },
      [billingAccountCustomerAuthorizationsTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [billingAccountManagerAuthorizationsTable._.name]: {
        create: true,
        update: false,
        delete: true,
      },
      [commentsTable._.name]: {
        create: true,
        update: true,
        delete: true,
      },
      [deliveryOptionsTable._.name]: {
        create: true,
        update: false,
        delete: false,
      },
      ["documents-mime-types"]: {
        create: false,
        update: true,
        delete: false,
      },
      ["documents-size-limit"]: {
        create: false,
        update: true,
        delete: false,
      },
      [invoicesTable._.name]: {
        create: true,
        update: false,
        delete: false,
      },
      [ordersTable._.name]: {
        create: true,
        update: true,
        delete: true,
      },
      "papercut-sync": {
        create: true,
        update: false,
        delete: false,
      },
      [productsTable._.name]: {
        create: true,
        update: true,
        delete: true,
      },
      [roomsTable._.name]: {
        create: true,
        update: true,
        delete: true,
      },
      services: {
        create: false,
        update: true,
        delete: false,
      },
      [tenantsTable._.name]: {
        create: false,
        update: true,
        delete: false,
      },
      [usersTable._.name]: {
        create: false,
        update: true,
        delete: true,
      },
      [workflowStatusesTable._.name]: {
        create: true,
        update: false,
        delete: false,
      },
    },
    operator: {
      [announcementsTable._.name]: {
        create: true,
        update: true,
        delete: true,
      },
      [billingAccountsTable._.name]: {
        create: false,
        update: true,
        delete: false,
      },
      [billingAccountCustomerAuthorizationsTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [billingAccountManagerAuthorizationsTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [commentsTable._.name]: {
        create: true,
        update: async (commentId: Comment["id"]) =>
          useTransaction((tx) =>
            tx
              .select({})
              .from(commentsTable)
              .where(
                and(
                  eq(commentsTable.id, commentId),
                  eq(commentsTable.tenantId, useTenant().id),
                  eq(commentsTable.authorId, useUser().id),
                ),
              )
              .then((rows) => rows.length > 0),
          ),
        delete: async (commentId: Comment["id"]) =>
          useTransaction((tx) =>
            tx
              .select({})
              .from(commentsTable)
              .where(
                and(
                  eq(commentsTable.id, commentId),
                  eq(commentsTable.tenantId, useTenant().id),
                  eq(commentsTable.authorId, useUser().id),
                ),
              )
              .then((rows) => rows.length > 0),
          ),
      },
      ["documents-mime-types"]: {
        create: false,
        update: false,
        delete: false,
      },
      ["documents-size-limit"]: {
        create: false,
        update: false,
        delete: false,
      },
      [deliveryOptionsTable._.name]: {
        create: true,
        update: false,
        delete: false,
      },
      [invoicesTable._.name]: {
        create: true,
        update: false,
        delete: false,
      },
      [ordersTable._.name]: {
        create: true,
        update: true,
        delete: true,
      },
      "papercut-sync": {
        create: false,
        update: false,
        delete: false,
      },
      [productsTable._.name]: {
        create: true,
        update: true,
        delete: true,
      },
      [roomsTable._.name]: {
        create: false,
        update: true,
        delete: false,
      },
      services: {
        create: false,
        update: false,
        delete: false,
      },
      [tenantsTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [usersTable._.name]: {
        create: false,
        update: false,
        delete: (userId: User["id"]) => userId !== useUser().id,
      },
      [workflowStatusesTable._.name]: {
        create: true,
        update: false,
        delete: false,
      },
    },
    manager: {
      [announcementsTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [billingAccountsTable._.name]: {
        create: false,
        update: async (billingAccountId: BillingAccount["id"]) =>
          useTransaction((tx) =>
            tx
              .select({})
              .from(billingAccountsTable)
              .innerJoin(
                billingAccountManagerAuthorizationsTable,
                and(
                  eq(
                    billingAccountsTable.id,
                    billingAccountManagerAuthorizationsTable.billingAccountId,
                  ),
                  eq(
                    billingAccountsTable.tenantId,
                    billingAccountManagerAuthorizationsTable.tenantId,
                  ),
                ),
              )
              .where(
                and(
                  eq(billingAccountsTable.id, billingAccountId),
                  eq(billingAccountsTable.tenantId, useTenant().id),
                  eq(
                    billingAccountManagerAuthorizationsTable.managerId,
                    useUser().id,
                  ),
                  isNull(billingAccountsTable.deletedAt),
                  isNull(billingAccountManagerAuthorizationsTable.deletedAt),
                ),
              )
              .then((rows) => rows.length > 0),
          ),
        delete: false,
      },
      [billingAccountCustomerAuthorizationsTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [billingAccountManagerAuthorizationsTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [commentsTable._.name]: {
        create: async (orderId: Order["id"]) =>
          useTransaction((tx) =>
            tx
              .select({})
              .from(ordersTable)
              .innerJoin(
                billingAccountsTable,
                and(
                  eq(ordersTable.billingAccountId, billingAccountsTable.id),
                  eq(ordersTable.tenantId, billingAccountsTable.tenantId),
                ),
              )
              .leftJoin(
                billingAccountManagerAuthorizationsTable,
                and(
                  eq(
                    billingAccountsTable.id,
                    billingAccountManagerAuthorizationsTable.billingAccountId,
                  ),
                  eq(
                    billingAccountsTable.tenantId,
                    billingAccountManagerAuthorizationsTable.tenantId,
                  ),
                ),
              )
              .where(
                and(
                  eq(ordersTable.id, orderId),
                  eq(ordersTable.tenantId, useTenant().id),
                  isNull(ordersTable.deletedAt),
                  or(
                    and(
                      eq(
                        billingAccountManagerAuthorizationsTable.managerId,
                        useUser().id,
                      ),
                      isNull(
                        billingAccountManagerAuthorizationsTable.deletedAt,
                      ),
                    ),
                    eq(ordersTable.customerId, useUser().id),
                  ),
                ),
              )
              .then((rows) => rows.length > 0),
          ),
        update: async (commentId: Comment["id"]) =>
          useTransaction((tx) =>
            tx
              .select({})
              .from(commentsTable)
              .where(
                and(
                  eq(commentsTable.id, commentId),
                  eq(commentsTable.tenantId, useTenant().id),
                  eq(commentsTable.authorId, useUser().id),
                ),
              )
              .then((rows) => rows.length > 0),
          ),
        delete: async (commentId: Comment["id"]) =>
          useTransaction((tx) =>
            tx
              .select({})
              .from(commentsTable)
              .where(
                and(
                  eq(commentsTable.id, commentId),
                  eq(commentsTable.tenantId, useTenant().id),
                  eq(commentsTable.authorId, useUser().id),
                ),
              )
              .then((rows) => rows.length > 0),
          ),
      },
      ["documents-mime-types"]: {
        create: false,
        update: false,
        delete: false,
      },
      ["documents-size-limit"]: {
        create: false,
        update: false,
        delete: false,
      },
      [deliveryOptionsTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [invoicesTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [ordersTable._.name]: {
        create: async (billingAccountId: BillingAccount["id"]) =>
          useTransaction((tx) =>
            tx
              .select({})
              .from(billingAccountsTable)
              .innerJoin(
                billingAccountCustomerAuthorizationsTable,
                and(
                  eq(
                    billingAccountsTable.id,
                    billingAccountCustomerAuthorizationsTable.billingAccountId,
                  ),
                  eq(
                    billingAccountsTable.tenantId,
                    billingAccountCustomerAuthorizationsTable.tenantId,
                  ),
                ),
              )
              .where(
                and(
                  eq(billingAccountsTable.id, billingAccountId),
                  eq(billingAccountsTable.tenantId, useTenant().id),
                ),
              )
              .then((rows) => rows.length > 0),
          ),
        update: async (orderId: Order["id"]) =>
          useTransaction((tx) =>
            tx
              .select({})
              .from(ordersTable)
              .innerJoin(
                billingAccountsTable,
                and(
                  eq(ordersTable.billingAccountId, billingAccountsTable.id),
                  eq(ordersTable.tenantId, billingAccountsTable.tenantId),
                ),
              )
              .leftJoin(
                billingAccountManagerAuthorizationsTable,
                and(
                  eq(
                    billingAccountsTable.id,
                    billingAccountManagerAuthorizationsTable.billingAccountId,
                  ),
                  eq(
                    billingAccountsTable.tenantId,
                    billingAccountManagerAuthorizationsTable.tenantId,
                  ),
                ),
              )
              .innerJoin(
                workflowStatusesTable,
                and(
                  eq(ordersTable.workflowStatus, workflowStatusesTable.id),
                  eq(ordersTable.tenantId, workflowStatusesTable.tenantId),
                ),
              )
              .where(
                and(
                  eq(ordersTable.id, orderId),
                  eq(ordersTable.tenantId, useTenant().id),
                  isNull(ordersTable.deletedAt),
                  eq(workflowStatusesTable.type, "Review"),
                  or(
                    and(
                      eq(
                        billingAccountManagerAuthorizationsTable.managerId,
                        useUser().id,
                      ),
                      isNull(
                        billingAccountManagerAuthorizationsTable.deletedAt,
                      ),
                    ),
                    eq(ordersTable.customerId, useUser().id),
                  ),
                ),
              )
              .then((rows) => rows.length > 0),
          ),
        delete: async (orderId: Order["id"]) =>
          useTransaction((tx) =>
            tx
              .select({})
              .from(ordersTable)
              .innerJoin(
                billingAccountsTable,
                and(
                  eq(ordersTable.billingAccountId, billingAccountsTable.id),
                  eq(ordersTable.tenantId, billingAccountsTable.tenantId),
                ),
              )
              .leftJoin(
                billingAccountManagerAuthorizationsTable,
                and(
                  eq(
                    billingAccountsTable.id,
                    billingAccountManagerAuthorizationsTable.billingAccountId,
                  ),
                  eq(
                    billingAccountsTable.tenantId,
                    billingAccountManagerAuthorizationsTable.tenantId,
                  ),
                ),
              )
              .innerJoin(
                workflowStatusesTable,
                and(
                  eq(ordersTable.workflowStatus, workflowStatusesTable.id),
                  eq(ordersTable.tenantId, workflowStatusesTable.tenantId),
                ),
              )
              .where(
                and(
                  eq(ordersTable.id, orderId),
                  eq(ordersTable.tenantId, useTenant().id),
                  isNull(ordersTable.deletedAt),
                  eq(workflowStatusesTable.type, "Review"),
                  or(
                    and(
                      eq(
                        billingAccountManagerAuthorizationsTable.managerId,
                        useUser().id,
                      ),
                      isNull(
                        billingAccountManagerAuthorizationsTable.deletedAt,
                      ),
                    ),
                    eq(ordersTable.customerId, useUser().id),
                  ),
                ),
              )
              .then((rows) => rows.length > 0),
          ),
      },
      "papercut-sync": {
        create: false,
        update: false,
        delete: false,
      },
      [productsTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [roomsTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      services: {
        create: false,
        update: false,
        delete: false,
      },
      [tenantsTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [usersTable._.name]: {
        create: false,
        update: false,
        delete: (userId: User["id"]) => userId === useUser().id,
      },
      [workflowStatusesTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
    },
    customer: {
      [announcementsTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [billingAccountsTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [billingAccountCustomerAuthorizationsTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [billingAccountManagerAuthorizationsTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [commentsTable._.name]: {
        create: async (orderId: Order["id"]) =>
          useTransaction((tx) =>
            tx
              .select({})
              .from(ordersTable)
              .where(
                and(
                  eq(ordersTable.id, orderId),
                  eq(ordersTable.tenantId, useTenant().id),
                  eq(ordersTable.customerId, useUser().id),
                  isNull(ordersTable.deletedAt),
                ),
              )
              .then((rows) => rows.length > 0),
          ),
        update: async (commentId: Comment["id"]) =>
          useTransaction((tx) =>
            tx
              .select({})
              .from(commentsTable)
              .where(
                and(
                  eq(commentsTable.id, commentId),
                  eq(commentsTable.tenantId, useTenant().id),
                  eq(commentsTable.authorId, useUser().id),
                  isNull(commentsTable.deletedAt),
                ),
              )
              .then((rows) => rows.length > 0),
          ),
        delete: async (commentId: Comment["id"]) =>
          useTransaction((tx) =>
            tx
              .select({})
              .from(commentsTable)
              .where(
                and(
                  eq(commentsTable.id, commentId),
                  eq(commentsTable.tenantId, useTenant().id),
                  eq(commentsTable.authorId, useUser().id),
                  isNull(commentsTable.deletedAt),
                ),
              )
              .then((rows) => rows.length > 0),
          ),
      },
      ["documents-mime-types"]: {
        create: false,
        update: false,
        delete: false,
      },
      ["documents-size-limit"]: {
        create: false,
        update: false,
        delete: false,
      },
      [deliveryOptionsTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [invoicesTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [ordersTable._.name]: {
        create: async (billingAccountId: BillingAccount["id"]) =>
          useTransaction((tx) =>
            tx
              .select({})
              .from(billingAccountsTable)
              .innerJoin(
                billingAccountCustomerAuthorizationsTable,
                and(
                  eq(
                    billingAccountsTable.id,
                    billingAccountCustomerAuthorizationsTable.billingAccountId,
                  ),
                  eq(
                    billingAccountsTable.tenantId,
                    billingAccountCustomerAuthorizationsTable.tenantId,
                  ),
                ),
              )
              .where(
                and(
                  eq(billingAccountsTable.id, billingAccountId),
                  eq(billingAccountsTable.tenantId, useTenant().id),
                ),
              )
              .then((rows) => rows.length > 0),
          ),
        update: async (orderId: Order["id"]) =>
          useTransaction((tx) =>
            tx
              .select({})
              .from(ordersTable)
              .innerJoin(
                workflowStatusesTable,
                and(
                  eq(ordersTable.workflowStatus, workflowStatusesTable.id),
                  eq(ordersTable.tenantId, workflowStatusesTable.tenantId),
                ),
              )
              .where(
                and(
                  eq(ordersTable.id, orderId),
                  eq(ordersTable.tenantId, useTenant().id),
                  eq(ordersTable.customerId, useUser().id),
                  eq(workflowStatusesTable.type, "Review"),
                  isNull(ordersTable.deletedAt),
                ),
              )
              .then((rows) => rows.length > 0),
          ),
        delete: async (orderId: Order["id"]) =>
          useTransaction((tx) =>
            tx
              .select({})
              .from(ordersTable)
              .innerJoin(
                workflowStatusesTable,
                and(
                  eq(ordersTable.workflowStatus, workflowStatusesTable.id),
                  eq(ordersTable.tenantId, workflowStatusesTable.tenantId),
                ),
              )
              .where(
                and(
                  eq(ordersTable.id, orderId),
                  eq(ordersTable.tenantId, useTenant().id),
                  eq(ordersTable.customerId, useUser().id),
                  eq(workflowStatusesTable.type, "Review"),
                  isNull(ordersTable.deletedAt),
                ),
              )
              .then((rows) => rows.length > 0),
          ),
      },
      "papercut-sync": {
        create: false,
        update: false,
        delete: false,
      },
      [productsTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [roomsTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      services: {
        create: false,
        update: false,
        delete: false,
      },
      [tenantsTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [usersTable._.name]: {
        create: false,
        update: false,
        delete: (userId: User["id"]) => userId === useUser().id,
      },
      [workflowStatusesTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
    },
  } as const satisfies Permissions;

  export async function check<
    TResource extends Resource,
    TAction extends Action,
    TPermission extends (typeof permissions)[UserRole][TResource][TAction],
  >(
    resource: TResource,
    action: TAction,
    ...input: TPermission extends (...input: infer TInput) => unknown
      ? TInput
      : Array<never>
  ) {
    const permission = (permissions as Permissions)[useUser().profile.role][
      resource
    ][action];

    return new Promise<boolean>((resolve) => {
      if (typeof permission === "boolean") return resolve(permission);

      return resolve(permission(...input));
    });
  }

  export async function enforce<
    TResource extends Resource,
    TAction extends Action,
    TPermission extends (typeof permissions)[UserRole][TResource][TAction],
    TMaybeError extends AnyError | undefined,
  >(
    args: Parameters<typeof check<TResource, TAction, TPermission>>,
    customError?: TMaybeError extends AnyError
      ? InferCustomError<CustomError<TMaybeError>>
      : never,
  ) {
    const access = await check(...args);

    if (!access) {
      const message = `Access denied for action "${args[1]}" on resource "${args[0]} with input "${args[2]}".`;

      console.log(message);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      if (customError) throw new customError.Error(...customError.args);

      throw new Error(message);
    }
  }
}
