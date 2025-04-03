import { and, eq, getTableName, isNull, or, sql } from "drizzle-orm";
import * as R from "remeda";

import { announcementsTable } from "../announcements/sql";
import {
  billingAccountCustomerAuthorizationsTable,
  billingAccountManagerAuthorizationsTable,
  billingAccountsTable,
} from "../billing-accounts/sql";
import { commentsTable } from "../comments/sql";
import { useTransaction } from "../drizzle/context";
import { invoicesTable } from "../invoices/sql";
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
import { usersTable } from "../users/sql";

import type { PgSelectBase } from "drizzle-orm/pg-core";
import type { BillingAccount } from "../billing-accounts/sql";
import type { Comment } from "../comments/sql";
import type { Metadata, SyncedTableName, TableByName } from "../data";
import type { Transaction } from "../drizzle/context";
import type { Order } from "../orders/sql";
import type { UserRole } from "../users/shared";
import type { User } from "../users/sql";
import type { AnyError, CustomError, InferCustomError } from "../utils/types";
import type { Action, Resource } from "./shared";

export namespace AccessControl {
  type MetadataBaseQuery<TTableName extends SyncedTableName> = PgSelectBase<
    TTableName,
    {
      id: TableByName<TTableName>["_"]["columns"]["id"];
      version: TableByName<TTableName>["_"]["columns"]["version"];
    },
    "partial",
    Record<TTableName, "not-null">,
    true
  >;

  type SyncedTableMetadataBaseQuery = {
    [TTableName in SyncedTableName]: (
      tx: Transaction,
    ) => MetadataBaseQuery<TTableName>;
  };

  const syncedTableMetadataBaseQuery = {
    [getTableName(announcementsTable)]: (tx) =>
      tx
        .select({
          id: announcementsTable.id,
          version: announcementsTable.version,
        })
        .from(announcementsTable)
        .where(eq(announcementsTable.tenantId, useTenant().id))
        .$dynamic(),
    [getTableName(billingAccountsTable)]: (tx) =>
      tx
        .select({
          id: billingAccountsTable.id,
          version: billingAccountsTable.version,
        })
        .from(billingAccountsTable)
        .where(eq(billingAccountsTable.tenantId, useTenant().id))
        .$dynamic(),
    [getTableName(billingAccountCustomerAuthorizationsTable)]: (tx) =>
      tx
        .select({
          id: billingAccountCustomerAuthorizationsTable.id,
          version: billingAccountCustomerAuthorizationsTable.version,
        })
        .from(billingAccountCustomerAuthorizationsTable)
        .where(
          eq(
            billingAccountCustomerAuthorizationsTable.tenantId,
            useTenant().id,
          ),
        )
        .$dynamic(),
    [getTableName(billingAccountManagerAuthorizationsTable)]: (tx) =>
      tx
        .select({
          id: billingAccountManagerAuthorizationsTable.id,
          version: billingAccountManagerAuthorizationsTable.version,
        })
        .from(billingAccountManagerAuthorizationsTable)
        .where(
          eq(billingAccountManagerAuthorizationsTable.tenantId, useTenant().id),
        )
        .$dynamic(),
    [getTableName(commentsTable)]: (tx) =>
      tx
        .select({
          id: commentsTable.id,
          version: commentsTable.version,
        })
        .from(commentsTable)
        .where(eq(commentsTable.tenantId, useTenant().id))
        .$dynamic(),
    [getTableName(deliveryOptionsTable)]: (tx) =>
      tx
        .select({
          id: deliveryOptionsTable.id,
          version: deliveryOptionsTable.version,
        })
        .from(deliveryOptionsTable)
        .where(eq(deliveryOptionsTable.tenantId, useTenant().id))
        .$dynamic(),
    [getTableName(invoicesTable)]: (tx) =>
      tx
        .select({
          id: invoicesTable.id,
          version: invoicesTable.version,
        })
        .from(invoicesTable)
        .where(eq(invoicesTable.tenantId, useTenant().id))
        .$dynamic(),
    [getTableName(ordersTable)]: (tx) =>
      tx
        .select({
          id: ordersTable.id,
          version: ordersTable.version,
        })
        .from(ordersTable)
        .where(
          and(
            eq(ordersTable.tenantId, useTenant().id),
            isNull(ordersTable.deletedAt),
          ),
        )
        .$dynamic(),
    [getTableName(productsTable)]: (tx) =>
      tx
        .select({
          id: productsTable.id,
          version: productsTable.version,
        })
        .from(productsTable)
        .where(eq(productsTable.tenantId, useTenant().id))
        .$dynamic(),
    [getTableName(roomsTable)]: (tx) =>
      tx
        .select({
          id: roomsTable.id,
          version: roomsTable.version,
        })
        .from(roomsTable)
        .where(eq(roomsTable.tenantId, useTenant().id))
        .$dynamic(),
    [getTableName(tenantsTable)]: (tx) =>
      tx
        .select({
          id: tenantsTable.id,
          version: tenantsTable.version,
        })
        .from(tenantsTable)
        .where(eq(tenantsTable.id, useTenant().id))
        .$dynamic(),
    [getTableName(usersTable)]: (tx) =>
      tx
        .select({
          id: usersTable.id,
          version: usersTable.version,
        })
        .from(usersTable)
        .where(
          and(
            eq(usersTable.tenantId, useTenant().id),
            isNull(usersTable.deletedAt),
          ),
        )
        .$dynamic(),
    [getTableName(workflowStatusesTable)]: (tx) =>
      tx
        .select({
          id: workflowStatusesTable.id,
          version: workflowStatusesTable.version,
        })
        .from(workflowStatusesTable)
        .where(and(eq(workflowStatusesTable.tenantId, useTenant().id)))
        .$dynamic(),
  } as const satisfies SyncedTableMetadataBaseQuery;

  export type SyncedTableMetadata = Record<
    UserRole,
    {
      [TName in SyncedTableName]: () => Promise<
        Array<Metadata<TableByName<TName>>>
      >;
    }
  >;

  export const syncedTableMetadata = {
    administrator: {
      [getTableName(announcementsTable)]: async () =>
        useTransaction(
          syncedTableMetadataBaseQuery[getTableName(announcementsTable)],
        ),
      [getTableName(billingAccountsTable)]: async () =>
        useTransaction(
          syncedTableMetadataBaseQuery[getTableName(billingAccountsTable)],
        ),
      [getTableName(billingAccountCustomerAuthorizationsTable)]: async () =>
        useTransaction(
          syncedTableMetadataBaseQuery[
            getTableName(billingAccountCustomerAuthorizationsTable)
          ],
        ),
      [getTableName(billingAccountManagerAuthorizationsTable)]: async () =>
        useTransaction(
          syncedTableMetadataBaseQuery[
            getTableName(billingAccountManagerAuthorizationsTable)
          ],
        ),
      [getTableName(commentsTable)]: async () =>
        useTransaction(
          syncedTableMetadataBaseQuery[getTableName(commentsTable)],
        ),
      [getTableName(deliveryOptionsTable)]: async () =>
        useTransaction(
          syncedTableMetadataBaseQuery[getTableName(deliveryOptionsTable)],
        ),
      [getTableName(invoicesTable)]: async () =>
        useTransaction(
          syncedTableMetadataBaseQuery[getTableName(invoicesTable)],
        ),
      [getTableName(ordersTable)]: async () =>
        useTransaction(syncedTableMetadataBaseQuery[getTableName(ordersTable)]),
      [getTableName(productsTable)]: async () =>
        useTransaction(
          syncedTableMetadataBaseQuery[getTableName(productsTable)],
        ),
      [getTableName(roomsTable)]: async () =>
        useTransaction(syncedTableMetadataBaseQuery[getTableName(roomsTable)]),
      [getTableName(tenantsTable)]: async () =>
        useTransaction(
          syncedTableMetadataBaseQuery[getTableName(tenantsTable)],
        ),
      [getTableName(usersTable)]: async () =>
        useTransaction(syncedTableMetadataBaseQuery[getTableName(usersTable)]),
      [getTableName(workflowStatusesTable)]: async () =>
        useTransaction(
          syncedTableMetadataBaseQuery[getTableName(workflowStatusesTable)],
        ),
    },
    operator: {
      [getTableName(announcementsTable)]: async () =>
        useTransaction(
          syncedTableMetadataBaseQuery[getTableName(announcementsTable)],
        ),
      [getTableName(billingAccountsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableMetadataBaseQuery[getTableName(billingAccountsTable)](
            tx,
          ).where(
            and(
              eq(billingAccountsTable.tenantId, useTenant().id),
              isNull(billingAccountsTable.deletedAt),
            ),
          ),
        ),
      [getTableName(billingAccountCustomerAuthorizationsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableMetadataBaseQuery[
            getTableName(billingAccountCustomerAuthorizationsTable)
          ](tx).where(
            and(
              eq(
                billingAccountCustomerAuthorizationsTable.tenantId,
                useTenant().id,
              ),
              isNull(billingAccountCustomerAuthorizationsTable.deletedAt),
            ),
          ),
        ),
      [getTableName(billingAccountManagerAuthorizationsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableMetadataBaseQuery[
            getTableName(billingAccountManagerAuthorizationsTable)
          ](tx).where(
            and(
              eq(
                billingAccountManagerAuthorizationsTable.tenantId,
                useTenant().id,
              ),
              isNull(billingAccountManagerAuthorizationsTable.deletedAt),
            ),
          ),
        ),
      [getTableName(commentsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableMetadataBaseQuery[getTableName(commentsTable)](tx).where(
            and(
              eq(commentsTable.tenantId, useTenant().id),
              sql`
                STRING_TO_ARRAY(${commentsTable.visibleTo}, ',') &&
                  ARRAY['operator','manager','customer']
              `,
              isNull(commentsTable.deletedAt),
            ),
          ),
        ),
      [getTableName(deliveryOptionsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableMetadataBaseQuery[getTableName(deliveryOptionsTable)](
            tx,
          ).where(
            and(
              eq(deliveryOptionsTable.tenantId, useTenant().id),
              isNull(roomsTable.deletedAt),
            ),
          ),
        ),
      [getTableName(invoicesTable)]: async () =>
        useTransaction((tx) =>
          syncedTableMetadataBaseQuery[getTableName(invoicesTable)](tx).where(
            and(
              eq(invoicesTable.tenantId, useTenant().id),
              isNull(invoicesTable.deletedAt),
            ),
          ),
        ),
      [getTableName(ordersTable)]: async () =>
        useTransaction((tx) =>
          syncedTableMetadataBaseQuery[getTableName(ordersTable)](tx),
        ),
      [getTableName(productsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableMetadataBaseQuery[getTableName(productsTable)](tx).where(
            and(
              eq(productsTable.tenantId, useTenant().id),
              isNull(productsTable.deletedAt),
            ),
          ),
        ),
      [getTableName(roomsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableMetadataBaseQuery[getTableName(roomsTable)](tx).where(
            and(
              eq(roomsTable.tenantId, useTenant().id),
              isNull(roomsTable.deletedAt),
            ),
          ),
        ),
      [getTableName(tenantsTable)]: async () =>
        useTransaction(
          syncedTableMetadataBaseQuery[getTableName(tenantsTable)],
        ),
      [getTableName(usersTable)]: async () =>
        useTransaction((tx) =>
          syncedTableMetadataBaseQuery[getTableName(usersTable)](tx).where(
            and(
              eq(usersTable.tenantId, useTenant().id),
              isNull(usersTable.deletedAt),
            ),
          ),
        ),
      [getTableName(workflowStatusesTable)]: async () =>
        useTransaction(
          syncedTableMetadataBaseQuery[getTableName(workflowStatusesTable)],
        ),
    },
    manager: {
      [getTableName(announcementsTable)]: async () =>
        useTransaction(
          syncedTableMetadataBaseQuery[getTableName(announcementsTable)],
        ),
      [getTableName(billingAccountsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableMetadataBaseQuery[getTableName(billingAccountsTable)](
            tx,
          ).where(
            and(
              eq(billingAccountsTable.tenantId, useTenant().id),
              isNull(billingAccountsTable.deletedAt),
            ),
          ),
        ),
      [getTableName(billingAccountCustomerAuthorizationsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableMetadataBaseQuery[
            getTableName(billingAccountCustomerAuthorizationsTable)
          ](tx).where(
            and(
              eq(
                billingAccountCustomerAuthorizationsTable.tenantId,
                useTenant().id,
              ),
              isNull(billingAccountCustomerAuthorizationsTable.deletedAt),
            ),
          ),
        ),
      [getTableName(billingAccountManagerAuthorizationsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableMetadataBaseQuery[
            getTableName(billingAccountManagerAuthorizationsTable)
          ](tx).where(
            and(
              eq(
                billingAccountManagerAuthorizationsTable.tenantId,
                useTenant().id,
              ),
              isNull(billingAccountManagerAuthorizationsTable.deletedAt),
            ),
          ),
        ),
      [getTableName(commentsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableMetadataBaseQuery[getTableName(commentsTable)](tx)
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
                eq(commentsTable.tenantId, useTenant().id),
                sql`
                  STRING_TO_ARRAY(${commentsTable.visibleTo}, ',') &&
                    ARRAY['manager','customer']
                `,
                isNull(commentsTable.deletedAt),
              ),
            ),
        ),
      [getTableName(deliveryOptionsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableMetadataBaseQuery[getTableName(deliveryOptionsTable)](
            tx,
          ).where(
            and(
              eq(deliveryOptionsTable.tenantId, useTenant().id),
              eq(roomsTable.status, "published"),
              isNull(roomsTable.deletedAt),
            ),
          ),
        ),
      [getTableName(invoicesTable)]: async () =>
        useTransaction((tx) =>
          syncedTableMetadataBaseQuery[getTableName(invoicesTable)](tx)
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
              and(
                eq(invoicesTable.tenantId, useTenant().id),
                or(
                  isNull(invoicesTable.deletedAt),
                  and(
                    eq(ordersTable.customerId, useUser().id),
                    isNull(invoicesTable.deletedAt),
                  ),
                ),
              ),
            ),
        ),
      [getTableName(ordersTable)]: async () =>
        useTransaction((tx) =>
          syncedTableMetadataBaseQuery[getTableName(ordersTable)](tx)
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
                eq(ordersTable.tenantId, useTenant().id),
                or(
                  isNull(ordersTable.deletedAt),
                  and(
                    eq(ordersTable.customerId, useUser().id),
                    isNull(ordersTable.deletedAt),
                  ),
                ),
              ),
            ),
        ),
      [getTableName(productsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableMetadataBaseQuery[getTableName(productsTable)](tx).where(
            and(
              eq(productsTable.tenantId, useTenant().id),
              eq(productsTable.status, "published"),
              isNull(productsTable.deletedAt),
            ),
          ),
        ),
      [getTableName(roomsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableMetadataBaseQuery[getTableName(roomsTable)](tx).where(
            and(
              eq(roomsTable.tenantId, useTenant().id),
              eq(roomsTable.status, "published"),
              isNull(roomsTable.deletedAt),
            ),
          ),
        ),
      [getTableName(tenantsTable)]: async () =>
        useTransaction(
          syncedTableMetadataBaseQuery[getTableName(tenantsTable)],
        ),
      [getTableName(usersTable)]: async () =>
        useTransaction((tx) =>
          syncedTableMetadataBaseQuery[getTableName(usersTable)](tx).where(
            and(
              eq(usersTable.tenantId, useTenant().id),
              isNull(usersTable.deletedAt),
            ),
          ),
        ),
      [getTableName(workflowStatusesTable)]: async () =>
        useTransaction(
          syncedTableMetadataBaseQuery[getTableName(workflowStatusesTable)],
        ),
    },
    customer: {
      [getTableName(announcementsTable)]: async () =>
        useTransaction(
          syncedTableMetadataBaseQuery[getTableName(announcementsTable)],
        ),
      [getTableName(billingAccountsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableMetadataBaseQuery[getTableName(billingAccountsTable)](
            tx,
          ).where(
            and(
              eq(billingAccountsTable.tenantId, useTenant().id),
              isNull(billingAccountsTable.deletedAt),
            ),
          ),
        ),
      [getTableName(billingAccountCustomerAuthorizationsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableMetadataBaseQuery[
            getTableName(billingAccountCustomerAuthorizationsTable)
          ](tx).where(
            and(
              eq(
                billingAccountCustomerAuthorizationsTable.tenantId,
                useTenant().id,
              ),
              isNull(billingAccountCustomerAuthorizationsTable.deletedAt),
            ),
          ),
        ),
      [getTableName(billingAccountManagerAuthorizationsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableMetadataBaseQuery[
            getTableName(billingAccountManagerAuthorizationsTable)
          ](tx).where(
            and(
              eq(
                billingAccountManagerAuthorizationsTable.tenantId,
                useTenant().id,
              ),
              isNull(billingAccountManagerAuthorizationsTable.deletedAt),
            ),
          ),
        ),
      [getTableName(commentsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableMetadataBaseQuery[getTableName(commentsTable)](tx)
            .innerJoin(
              ordersTable,
              and(
                eq(commentsTable.orderId, ordersTable.id),
                eq(commentsTable.tenantId, ordersTable.tenantId),
              ),
            )
            .where(
              and(
                eq(commentsTable.tenantId, useTenant().id),
                eq(ordersTable.customerId, useUser().id),
                sql`
                  STRING_TO_ARRAY(${commentsTable.visibleTo}, ',') &&
                    ARRAY['customer']
                `,
                isNull(commentsTable.deletedAt),
              ),
            ),
        ),
      [getTableName(deliveryOptionsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableMetadataBaseQuery[getTableName(deliveryOptionsTable)](
            tx,
          ).where(
            and(
              eq(deliveryOptionsTable.tenantId, useTenant().id),
              eq(roomsTable.status, "published"),
              isNull(roomsTable.deletedAt),
            ),
          ),
        ),
      [getTableName(invoicesTable)]: async () =>
        useTransaction((tx) =>
          syncedTableMetadataBaseQuery[getTableName(invoicesTable)](tx)
            .innerJoin(
              ordersTable,
              and(
                eq(invoicesTable.orderId, ordersTable.id),
                eq(invoicesTable.tenantId, ordersTable.tenantId),
              ),
            )
            .where(
              and(
                eq(invoicesTable.tenantId, useTenant().id),
                eq(ordersTable.customerId, useUser().id),
                isNull(invoicesTable.deletedAt),
              ),
            ),
        ),
      [getTableName(ordersTable)]: async () =>
        useTransaction((tx) =>
          syncedTableMetadataBaseQuery[getTableName(ordersTable)](tx).where(
            and(
              eq(ordersTable.tenantId, useTenant().id),
              isNull(ordersTable.deletedAt),
              eq(ordersTable.customerId, useUser().id),
            ),
          ),
        ),
      [getTableName(productsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableMetadataBaseQuery[getTableName(productsTable)](tx).where(
            and(
              eq(productsTable.tenantId, useTenant().id),
              eq(productsTable.status, "published"),
              isNull(productsTable.deletedAt),
            ),
          ),
        ),
      [getTableName(roomsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableMetadataBaseQuery[getTableName(roomsTable)](tx).where(
            and(
              eq(roomsTable.tenantId, useTenant().id),
              eq(roomsTable.status, "published"),
              isNull(roomsTable.deletedAt),
            ),
          ),
        ),
      [getTableName(tenantsTable)]: async () =>
        useTransaction(
          syncedTableMetadataBaseQuery[getTableName(tenantsTable)],
        ),
      [getTableName(usersTable)]: async () =>
        useTransaction((tx) =>
          syncedTableMetadataBaseQuery[getTableName(usersTable)](tx).where(
            and(
              eq(usersTable.tenantId, useTenant().id),
              isNull(usersTable.deletedAt),
            ),
          ),
        ),
      [getTableName(workflowStatusesTable)]: async () =>
        useTransaction(
          syncedTableMetadataBaseQuery[getTableName(workflowStatusesTable)],
        ),
    },
  } as const satisfies SyncedTableMetadata;

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
      [getTableName(announcementsTable)]: {
        create: true,
        read: true,
        update: true,
        delete: true,
      },
      [getTableName(billingAccountsTable)]: {
        create: false,
        read: true,
        update: true,
        delete: true,
      },
      [getTableName(billingAccountCustomerAuthorizationsTable)]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      [getTableName(billingAccountManagerAuthorizationsTable)]: {
        create: true,
        read: true,
        update: false,
        delete: true,
      },
      [getTableName(commentsTable)]: {
        create: true,
        read: true,
        update: true,
        delete: true,
      },
      [getTableName(deliveryOptionsTable)]: {
        create: true,
        read: true,
        update: false,
        delete: false,
      },
      ["documents-mime-types"]: {
        create: false,
        read: true,
        update: true,
        delete: false,
      },
      ["documents-size-limit"]: {
        create: false,
        read: true,
        update: true,
        delete: false,
      },
      [getTableName(invoicesTable)]: {
        create: true,
        read: true,
        update: false,
        delete: false,
      },
      ["monthly-active-users"]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      [getTableName(ordersTable)]: {
        create: true,
        read: true,
        update: true,
        delete: true,
      },
      "papercut-sync": {
        create: true,
        read: true,
        update: false,
        delete: false,
      },
      [getTableName(productsTable)]: {
        create: true,
        read: true,
        update: true,
        delete: true,
      },
      [getTableName(roomsTable)]: {
        create: true,
        read: true,
        update: true,
        delete: true,
      },
      services: {
        create: false,
        read: true,
        update: true,
        delete: false,
      },
      [getTableName(tenantsTable)]: {
        create: false,
        read: true,
        update: true,
        delete: false,
      },
      [getTableName(usersTable)]: {
        create: false,
        read: true,
        update: true,
        delete: true,
      },
      [getTableName(workflowStatusesTable)]: {
        create: true,
        read: true,
        update: false,
        delete: false,
      },
    },
    operator: {
      [getTableName(announcementsTable)]: {
        create: true,
        read: true,
        update: true,
        delete: true,
      },
      [getTableName(billingAccountsTable)]: {
        create: false,
        read: true,
        update: true,
        delete: false,
      },
      [getTableName(billingAccountCustomerAuthorizationsTable)]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      [getTableName(billingAccountManagerAuthorizationsTable)]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      [getTableName(commentsTable)]: {
        create: true,
        read: true,
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
              .then(R.isNot(R.isEmpty)),
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
              .then(R.isNot(R.isEmpty)),
          ),
      },
      [getTableName(deliveryOptionsTable)]: {
        create: true,
        read: true,
        update: false,
        delete: false,
      },
      ["documents-mime-types"]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      ["documents-size-limit"]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      [getTableName(invoicesTable)]: {
        create: true,
        read: true,
        update: false,
        delete: false,
      },
      ["monthly-active-users"]: {
        create: false,
        read: false,
        update: false,
        delete: false,
      },
      [getTableName(ordersTable)]: {
        create: true,
        read: true,
        update: true,
        delete: true,
      },
      "papercut-sync": {
        create: false,
        read: false,
        update: false,
        delete: false,
      },
      [getTableName(productsTable)]: {
        create: true,
        read: true,
        update: true,
        delete: true,
      },
      [getTableName(roomsTable)]: {
        create: false,
        read: true,
        update: true,
        delete: false,
      },
      services: {
        create: false,
        read: false,
        update: false,
        delete: false,
      },
      [getTableName(tenantsTable)]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      [getTableName(usersTable)]: {
        create: false,
        read: true,
        update: false,
        delete: (userId: User["id"]) => userId !== useUser().id,
      },
      [getTableName(workflowStatusesTable)]: {
        create: true,
        read: true,
        update: false,
        delete: false,
      },
    },
    manager: {
      [getTableName(announcementsTable)]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      [getTableName(billingAccountsTable)]: {
        create: false,
        read: true,
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
              .then(R.isNot(R.isEmpty)),
          ),
        delete: false,
      },
      [getTableName(billingAccountCustomerAuthorizationsTable)]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      [getTableName(billingAccountManagerAuthorizationsTable)]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      [getTableName(commentsTable)]: {
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
              .then(R.isNot(R.isEmpty)),
          ),
        read: true,
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
              .then(R.isNot(R.isEmpty)),
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
              .then(R.isNot(R.isEmpty)),
          ),
      },
      [getTableName(deliveryOptionsTable)]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      ["documents-mime-types"]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      ["documents-size-limit"]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      [getTableName(invoicesTable)]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      ["monthly-active-users"]: {
        create: false,
        read: false,
        update: false,
        delete: false,
      },
      [getTableName(ordersTable)]: {
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
              .then(R.isNot(R.isEmpty)),
          ),
        read: true,
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
              .then(R.isNot(R.isEmpty)),
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
              .then(R.isNot(R.isEmpty)),
          ),
      },
      "papercut-sync": {
        create: false,
        read: false,
        update: false,
        delete: false,
      },
      [getTableName(productsTable)]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      [getTableName(roomsTable)]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      services: {
        create: false,
        read: false,
        update: false,
        delete: false,
      },
      [getTableName(tenantsTable)]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      [getTableName(usersTable)]: {
        create: false,
        read: true,
        update: false,
        delete: (userId: User["id"]) => userId === useUser().id,
      },
      [getTableName(workflowStatusesTable)]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
    },
    customer: {
      [getTableName(announcementsTable)]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      [getTableName(billingAccountsTable)]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      [getTableName(billingAccountCustomerAuthorizationsTable)]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      [getTableName(billingAccountManagerAuthorizationsTable)]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      [getTableName(commentsTable)]: {
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
              .then(R.isNot(R.isEmpty)),
          ),
        read: true,
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
              .then(R.isNot(R.isEmpty)),
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
              .then(R.isNot(R.isEmpty)),
          ),
      },
      [getTableName(deliveryOptionsTable)]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      ["documents-mime-types"]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      ["documents-size-limit"]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      [getTableName(invoicesTable)]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      ["monthly-active-users"]: {
        create: false,
        read: false,
        update: false,
        delete: false,
      },
      [getTableName(ordersTable)]: {
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
              .then(R.isNot(R.isEmpty)),
          ),
        read: true,
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
              .then(R.isNot(R.isEmpty)),
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
              .then(R.isNot(R.isEmpty)),
          ),
      },
      "papercut-sync": {
        create: false,
        read: false,
        update: false,
        delete: false,
      },
      [getTableName(productsTable)]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      [getTableName(roomsTable)]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      services: {
        create: false,
        read: false,
        update: false,
        delete: false,
      },
      [getTableName(tenantsTable)]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      [getTableName(usersTable)]: {
        create: false,
        read: true,
        update: false,
        delete: (userId: User["id"]) => userId === useUser().id,
      },
      [getTableName(workflowStatusesTable)]: {
        create: false,
        read: true,
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
    const permission = (permissions as Permissions)[useUser().role][resource][
      action
    ];

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
