import { and, eq, getTableName, isNull, or, sql } from "drizzle-orm";

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
import type { Transaction } from "../drizzle/context";
import type { Order } from "../orders/sql";
import type { Metadata } from "../replicache/data";
import type { UserRole } from "../users/shared";
import type { User } from "../users/sql";
import type { SyncedTableName, TableByName } from "../utils/tables";
import type { AnyError, CustomError, InferCustomError } from "../utils/types";
import type { Action, Resource } from "./shared";

export namespace AccessControl {
  type SyncedTableResourceMetadataBaseQuery = {
    [TName in SyncedTableName]: (tx: Transaction) => PgSelectBase<
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
    [getTableName(announcementsTable)]: (tx) =>
      tx
        .select({
          id: announcementsTable.id,
          rowVersion: getRowVersionColumn(getTableName(announcementsTable)),
        })
        .from(announcementsTable)
        .where(eq(announcementsTable.tenantId, useTenant().id))
        .$dynamic(),
    [getTableName(billingAccountsTable)]: (tx) =>
      tx
        .select({
          id: billingAccountsTable.id,
          rowVersion: getRowVersionColumn(getTableName(billingAccountsTable)),
        })
        .from(billingAccountsTable)
        .where(eq(billingAccountsTable.tenantId, useTenant().id))
        .$dynamic(),
    [getTableName(billingAccountCustomerAuthorizationsTable)]: (tx) =>
      tx
        .select({
          id: billingAccountCustomerAuthorizationsTable.id,
          rowVersion: getRowVersionColumn(
            getTableName(billingAccountCustomerAuthorizationsTable),
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
    [getTableName(billingAccountManagerAuthorizationsTable)]: (tx) =>
      tx
        .select({
          id: billingAccountManagerAuthorizationsTable.id,
          rowVersion: getRowVersionColumn(
            getTableName(billingAccountManagerAuthorizationsTable),
          ),
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
          rowVersion: getRowVersionColumn(getTableName(commentsTable)),
        })
        .from(commentsTable)
        .where(eq(commentsTable.tenantId, useTenant().id))
        .$dynamic(),
    [getTableName(deliveryOptionsTable)]: (tx) =>
      tx
        .select({
          id: deliveryOptionsTable.id,
          rowVersion: getRowVersionColumn(getTableName(deliveryOptionsTable)),
        })
        .from(deliveryOptionsTable)
        .where(eq(deliveryOptionsTable.tenantId, useTenant().id))
        .$dynamic(),
    [getTableName(invoicesTable)]: (tx) =>
      tx
        .select({
          id: invoicesTable.id,
          rowVersion: getRowVersionColumn(getTableName(invoicesTable)),
        })
        .from(invoicesTable)
        .where(eq(invoicesTable.tenantId, useTenant().id))
        .$dynamic(),
    [getTableName(ordersTable)]: (tx) =>
      tx
        .select({
          id: ordersTable.id,
          rowVersion: getRowVersionColumn(getTableName(ordersTable)),
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
          rowVersion: getRowVersionColumn(getTableName(productsTable)),
        })
        .from(productsTable)
        .where(eq(productsTable.tenantId, useTenant().id))
        .$dynamic(),
    [getTableName(roomsTable)]: (tx) =>
      tx
        .select({
          id: roomsTable.id,
          rowVersion: getRowVersionColumn(getTableName(roomsTable)),
        })
        .from(roomsTable)
        .where(eq(roomsTable.tenantId, useTenant().id))
        .$dynamic(),
    [getTableName(tenantsTable)]: (tx) =>
      tx
        .select({
          id: tenantsTable.id,
          rowVersion: getRowVersionColumn(getTableName(tenantsTable)),
        })
        .from(tenantsTable)
        .where(eq(tenantsTable.id, useTenant().id))
        .$dynamic(),
    [getTableName(usersTable)]: (tx) =>
      tx
        .select({
          id: usersTable.id,
          rowVersion: getRowVersionColumn(getTableName(usersTable)),
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
    [getTableName(workflowStatusesTable)]: (tx) =>
      tx
        .select({
          id: workflowStatusesTable.id,
          rowVersion: getRowVersionColumn(getTableName(workflowStatusesTable)),
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
      [getTableName(announcementsTable)]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[
            getTableName(announcementsTable)
          ],
        ),
      [getTableName(billingAccountsTable)]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[
            getTableName(billingAccountsTable)
          ],
        ),
      [getTableName(billingAccountCustomerAuthorizationsTable)]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[
            getTableName(billingAccountCustomerAuthorizationsTable)
          ],
        ),
      [getTableName(billingAccountManagerAuthorizationsTable)]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[
            getTableName(billingAccountManagerAuthorizationsTable)
          ],
        ),
      [getTableName(commentsTable)]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[getTableName(commentsTable)],
        ),
      [getTableName(deliveryOptionsTable)]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[
            getTableName(deliveryOptionsTable)
          ],
        ),
      [getTableName(invoicesTable)]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[getTableName(invoicesTable)],
        ),
      [getTableName(ordersTable)]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[getTableName(ordersTable)],
        ),
      [getTableName(productsTable)]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[getTableName(productsTable)],
        ),
      [getTableName(roomsTable)]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[getTableName(roomsTable)],
        ),
      [getTableName(tenantsTable)]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[getTableName(tenantsTable)],
        ),
      [getTableName(usersTable)]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[getTableName(usersTable)],
        ),
      [getTableName(workflowStatusesTable)]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[
            getTableName(workflowStatusesTable)
          ],
        ),
    },
    operator: {
      [getTableName(announcementsTable)]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[
            getTableName(announcementsTable)
          ],
        ),
      [getTableName(billingAccountsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[
            getTableName(billingAccountsTable)
          ](tx).where(isNull(billingAccountsTable.deletedAt)),
        ),
      [getTableName(billingAccountCustomerAuthorizationsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[
            getTableName(billingAccountCustomerAuthorizationsTable)
          ](tx).where(
            isNull(billingAccountCustomerAuthorizationsTable.deletedAt),
          ),
        ),
      [getTableName(billingAccountManagerAuthorizationsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[
            getTableName(billingAccountManagerAuthorizationsTable)
          ](tx).where(
            isNull(billingAccountManagerAuthorizationsTable.deletedAt),
          ),
        ),
      [getTableName(commentsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[getTableName(commentsTable)](
            tx,
          ).where(
            and(
              sql`
                STRING_TO_ARRAY(${commentsTable.visibleTo}, ',') &&
                  ARRAY['operator', 'manager', 'customer']
              `,
              isNull(commentsTable.deletedAt),
            ),
          ),
        ),
      [getTableName(deliveryOptionsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[
            getTableName(deliveryOptionsTable)
          ](tx).where(isNull(roomsTable.deletedAt)),
        ),
      [getTableName(invoicesTable)]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[getTableName(invoicesTable)](
            tx,
          ).where(isNull(invoicesTable.deletedAt)),
        ),
      [getTableName(ordersTable)]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[getTableName(ordersTable)](
            tx,
          ).where(isNull(ordersTable.deletedAt)),
        ),
      [getTableName(productsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[getTableName(productsTable)](
            tx,
          ).where(isNull(productsTable.deletedAt)),
        ),
      [getTableName(roomsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[getTableName(roomsTable)](
            tx,
          ).where(isNull(roomsTable.deletedAt)),
        ),
      [getTableName(tenantsTable)]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[getTableName(tenantsTable)],
        ),
      [getTableName(usersTable)]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[getTableName(usersTable)](
            tx,
          ).where(isNull(userProfilesTable.deletedAt)),
        ),
      [getTableName(workflowStatusesTable)]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[
            getTableName(workflowStatusesTable)
          ],
        ),
    },
    manager: {
      [getTableName(announcementsTable)]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[
            getTableName(announcementsTable)
          ],
        ),
      [getTableName(billingAccountsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[
            getTableName(billingAccountsTable)
          ](tx).where(isNull(billingAccountsTable.deletedAt)),
        ),
      [getTableName(billingAccountCustomerAuthorizationsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[
            getTableName(billingAccountCustomerAuthorizationsTable)
          ](tx).where(
            isNull(billingAccountCustomerAuthorizationsTable.deletedAt),
          ),
        ),
      [getTableName(billingAccountManagerAuthorizationsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[
            getTableName(billingAccountManagerAuthorizationsTable)
          ](tx).where(
            isNull(billingAccountManagerAuthorizationsTable.deletedAt),
          ),
        ),
      [getTableName(commentsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[getTableName(commentsTable)](tx)
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
                sql`
                  STRING_TO_ARRAY(${commentsTable.visibleTo}, ',') &&
                    ARRAY['manager', 'customer']
                `,
                isNull(commentsTable.deletedAt),
              ),
            ),
        ),
      [getTableName(deliveryOptionsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[
            getTableName(deliveryOptionsTable)
          ](tx).where(
            and(
              eq(roomsTable.status, "published"),
              isNull(roomsTable.deletedAt),
            ),
          ),
        ),
      [getTableName(invoicesTable)]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[getTableName(invoicesTable)](tx)
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
      [getTableName(ordersTable)]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[getTableName(ordersTable)](tx)
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
      [getTableName(productsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[getTableName(productsTable)](
            tx,
          ).where(
            and(
              eq(productsTable.status, "published"),
              isNull(productsTable.deletedAt),
            ),
          ),
        ),
      [getTableName(roomsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[getTableName(roomsTable)](
            tx,
          ).where(
            and(
              eq(roomsTable.status, "published"),
              isNull(roomsTable.deletedAt),
            ),
          ),
        ),
      [getTableName(tenantsTable)]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[getTableName(tenantsTable)],
        ),
      [getTableName(usersTable)]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[getTableName(usersTable)](
            tx,
          ).where(isNull(userProfilesTable.deletedAt)),
        ),
      [getTableName(workflowStatusesTable)]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[
            getTableName(workflowStatusesTable)
          ],
        ),
    },
    customer: {
      [getTableName(announcementsTable)]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[
            getTableName(announcementsTable)
          ],
        ),
      [getTableName(billingAccountsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[
            getTableName(billingAccountsTable)
          ](tx).where(isNull(billingAccountsTable.deletedAt)),
        ),
      [getTableName(billingAccountCustomerAuthorizationsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[
            getTableName(billingAccountCustomerAuthorizationsTable)
          ](tx).where(
            isNull(billingAccountCustomerAuthorizationsTable.deletedAt),
          ),
        ),
      [getTableName(billingAccountManagerAuthorizationsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[
            getTableName(billingAccountManagerAuthorizationsTable)
          ](tx).where(
            isNull(billingAccountManagerAuthorizationsTable.deletedAt),
          ),
        ),
      [getTableName(commentsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[getTableName(commentsTable)](tx)
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
          syncedTableResourceMetadataBaseQuery[
            getTableName(deliveryOptionsTable)
          ](tx).where(
            and(
              eq(roomsTable.status, "published"),
              isNull(roomsTable.deletedAt),
            ),
          ),
        ),
      [getTableName(invoicesTable)]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[getTableName(invoicesTable)](tx)
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
      [getTableName(ordersTable)]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[getTableName(ordersTable)](
            tx,
          ).where(
            and(
              eq(ordersTable.customerId, useUser().id),
              isNull(ordersTable.deletedAt),
            ),
          ),
        ),
      [getTableName(productsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[getTableName(productsTable)](
            tx,
          ).where(
            and(
              eq(productsTable.status, "published"),
              isNull(productsTable.deletedAt),
            ),
          ),
        ),
      [getTableName(roomsTable)]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[getTableName(roomsTable)](
            tx,
          ).where(
            and(
              eq(roomsTable.status, "published"),
              isNull(roomsTable.deletedAt),
            ),
          ),
        ),
      [getTableName(tenantsTable)]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[getTableName(tenantsTable)],
        ),
      [getTableName(usersTable)]: async () =>
        useTransaction((tx) =>
          syncedTableResourceMetadataBaseQuery[getTableName(usersTable)](
            tx,
          ).where(isNull(userProfilesTable.deletedAt)),
        ),
      [getTableName(workflowStatusesTable)]: async () =>
        useTransaction(
          syncedTableResourceMetadataBaseQuery[
            getTableName(workflowStatusesTable)
          ],
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
      [getTableName(announcementsTable)]: {
        create: true,
        update: true,
        delete: true,
      },
      [getTableName(billingAccountsTable)]: {
        create: false,
        update: true,
        delete: true,
      },
      [getTableName(billingAccountCustomerAuthorizationsTable)]: {
        create: false,
        update: false,
        delete: false,
      },
      [getTableName(billingAccountManagerAuthorizationsTable)]: {
        create: true,
        update: false,
        delete: true,
      },
      [getTableName(commentsTable)]: {
        create: true,
        update: true,
        delete: true,
      },
      [getTableName(deliveryOptionsTable)]: {
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
      [getTableName(invoicesTable)]: {
        create: true,
        update: false,
        delete: false,
      },
      [getTableName(ordersTable)]: {
        create: true,
        update: true,
        delete: true,
      },
      "papercut-sync": {
        create: true,
        update: false,
        delete: false,
      },
      [getTableName(productsTable)]: {
        create: true,
        update: true,
        delete: true,
      },
      [getTableName(roomsTable)]: {
        create: true,
        update: true,
        delete: true,
      },
      services: {
        create: false,
        update: true,
        delete: false,
      },
      [getTableName(tenantsTable)]: {
        create: false,
        update: true,
        delete: false,
      },
      [getTableName(usersTable)]: {
        create: false,
        update: true,
        delete: true,
      },
      [getTableName(workflowStatusesTable)]: {
        create: true,
        update: false,
        delete: false,
      },
    },
    operator: {
      [getTableName(announcementsTable)]: {
        create: true,
        update: true,
        delete: true,
      },
      [getTableName(billingAccountsTable)]: {
        create: false,
        update: true,
        delete: false,
      },
      [getTableName(billingAccountCustomerAuthorizationsTable)]: {
        create: false,
        update: false,
        delete: false,
      },
      [getTableName(billingAccountManagerAuthorizationsTable)]: {
        create: false,
        update: false,
        delete: false,
      },
      [getTableName(commentsTable)]: {
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
      [getTableName(deliveryOptionsTable)]: {
        create: true,
        update: false,
        delete: false,
      },
      [getTableName(invoicesTable)]: {
        create: true,
        update: false,
        delete: false,
      },
      [getTableName(ordersTable)]: {
        create: true,
        update: true,
        delete: true,
      },
      "papercut-sync": {
        create: false,
        update: false,
        delete: false,
      },
      [getTableName(productsTable)]: {
        create: true,
        update: true,
        delete: true,
      },
      [getTableName(roomsTable)]: {
        create: false,
        update: true,
        delete: false,
      },
      services: {
        create: false,
        update: false,
        delete: false,
      },
      [getTableName(tenantsTable)]: {
        create: false,
        update: false,
        delete: false,
      },
      [getTableName(usersTable)]: {
        create: false,
        update: false,
        delete: (userId: User["id"]) => userId !== useUser().id,
      },
      [getTableName(workflowStatusesTable)]: {
        create: true,
        update: false,
        delete: false,
      },
    },
    manager: {
      [getTableName(announcementsTable)]: {
        create: false,
        update: false,
        delete: false,
      },
      [getTableName(billingAccountsTable)]: {
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
      [getTableName(billingAccountCustomerAuthorizationsTable)]: {
        create: false,
        update: false,
        delete: false,
      },
      [getTableName(billingAccountManagerAuthorizationsTable)]: {
        create: false,
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
      [getTableName(deliveryOptionsTable)]: {
        create: false,
        update: false,
        delete: false,
      },
      [getTableName(invoicesTable)]: {
        create: false,
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
      [getTableName(productsTable)]: {
        create: false,
        update: false,
        delete: false,
      },
      [getTableName(roomsTable)]: {
        create: false,
        update: false,
        delete: false,
      },
      services: {
        create: false,
        update: false,
        delete: false,
      },
      [getTableName(tenantsTable)]: {
        create: false,
        update: false,
        delete: false,
      },
      [getTableName(usersTable)]: {
        create: false,
        update: false,
        delete: (userId: User["id"]) => userId === useUser().id,
      },
      [getTableName(workflowStatusesTable)]: {
        create: false,
        update: false,
        delete: false,
      },
    },
    customer: {
      [getTableName(announcementsTable)]: {
        create: false,
        update: false,
        delete: false,
      },
      [getTableName(billingAccountsTable)]: {
        create: false,
        update: false,
        delete: false,
      },
      [getTableName(billingAccountCustomerAuthorizationsTable)]: {
        create: false,
        update: false,
        delete: false,
      },
      [getTableName(billingAccountManagerAuthorizationsTable)]: {
        create: false,
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
      [getTableName(deliveryOptionsTable)]: {
        create: false,
        update: false,
        delete: false,
      },
      [getTableName(invoicesTable)]: {
        create: false,
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
      [getTableName(productsTable)]: {
        create: false,
        update: false,
        delete: false,
      },
      [getTableName(roomsTable)]: {
        create: false,
        update: false,
        delete: false,
      },
      services: {
        create: false,
        update: false,
        delete: false,
      },
      [getTableName(tenantsTable)]: {
        create: false,
        update: false,
        delete: false,
      },
      [getTableName(usersTable)]: {
        create: false,
        update: false,
        delete: (userId: User["id"]) => userId === useUser().id,
      },
      [getTableName(workflowStatusesTable)]: {
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

      if (customError) throw new customError.Error(...customError.args);

      throw new Error(message);
    }
  }
}
