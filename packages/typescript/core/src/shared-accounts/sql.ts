import { and, eq, getViewSelectedFields, isNull } from "drizzle-orm";
import { bigint, index, numeric, snakeCase, text, uniqueIndex } from "drizzle-orm/pg-core";

import { Columns } from "../columns";
import { activeCustomerGroupMembershipsView } from "../groups/sql";
import { Tables } from "../tables";

import type { InferSelectModel, InferSelectViewModel } from "drizzle-orm";
import type { Discriminate } from "../utils";

export const sharedAccountCustomerAccess = new Tables.Sync(
  `shared_account_customer_access`,
  {
    customerId: Columns.entityId().notNull(),
    sharedAccountId: Columns.entityId().notNull(),
  },
  (table) => [
    uniqueIndex().on(table.customerId, table.sharedAccountId, table.tenantId),
    index().on(table.customerId),
  ],
);
export const sharedAccountCustomerAccessTable = sharedAccountCustomerAccess.table;
export type SharedAccountCustomerAccessTable = typeof sharedAccountCustomerAccessTable;
export type SharedAccountCustomerAccess = InferSelectModel<SharedAccountCustomerAccessTable>;

export const activeSharedAccountCustomerAccessView = snakeCase
  .view(`active_${sharedAccountCustomerAccess.name}`)
  .as((qb) =>
    qb
      .select()
      .from(sharedAccountCustomerAccessTable)
      .where(isNull(sharedAccountCustomerAccessTable.deletedAt)),
  );
export type ActiveSharedAccountCustomerAccessView = typeof activeSharedAccountCustomerAccessView;
export type ActiveSharedAccountCustomerAccess =
  InferSelectViewModel<ActiveSharedAccountCustomerAccessView>;

export type ActiveAuthorizedSharedAccountCustomerAccessView = ActiveSharedAccountCustomerAccessView;
export type ActiveAuthorizedSharedAccountCustomerAccess = ActiveSharedAccountCustomerAccess;

export const sharedAccountManagerAccess = new Tables.Sync(
  "shared_account_manager_access",
  {
    managerId: Columns.entityId().notNull(),
    sharedAccountId: Columns.entityId().notNull(),
  },
  (table) => [
    uniqueIndex().on(table.sharedAccountId, table.managerId, table.tenantId),
    index().on(table.managerId),
  ],
);
export const sharedAccountManagerAccessTable = sharedAccountManagerAccess.table;
export type SharedAccountManagerAccessTable = typeof sharedAccountManagerAccessTable;
export type SharedAccountManagerAccess = InferSelectModel<SharedAccountManagerAccessTable>;

export const activeSharedAccountManagerAccessView = snakeCase
  .view(`active_${sharedAccountManagerAccess.name}`)
  .as((qb) =>
    qb
      .select()
      .from(sharedAccountManagerAccessTable)
      .where(isNull(sharedAccountManagerAccessTable.deletedAt)),
  );
export type ActiveSharedAccountManagerAccessView = typeof activeSharedAccountManagerAccessView;
export type ActiveSharedAccountManagerAccess =
  InferSelectViewModel<ActiveSharedAccountManagerAccessView>;

export type ActiveAuthorizedSharedAccountManagerAccessView = ActiveSharedAccountManagerAccessView;
export type ActiveAuthorizedSharedAccountManagerAccess = ActiveSharedAccountManagerAccess;

export const activeCustomerAuthorizedSharedAccountManagerAccessView = snakeCase
  .view(`active_customer_authorized_${sharedAccountManagerAccess.name}`)
  .as((qb) =>
    qb
      .select({
        ...getViewSelectedFields(activeSharedAccountManagerAccessView),
        customerId: activeSharedAccountCustomerAccessView.customerId,
      })
      .from(activeSharedAccountManagerAccessView)
      .innerJoin(
        activeSharedAccountCustomerAccessView,
        and(
          eq(
            activeSharedAccountManagerAccessView.sharedAccountId,
            activeSharedAccountCustomerAccessView.sharedAccountId,
          ),
          eq(
            activeSharedAccountManagerAccessView.tenantId,
            activeSharedAccountCustomerAccessView.tenantId,
          ),
        ),
      ),
  );
export type ActiveCustomerAuthorizedSharedAccountManagerAccessView =
  typeof activeCustomerAuthorizedSharedAccountManagerAccessView;
export type ActiveCustomerAuthorizedSharedAccountManagerAccess =
  InferSelectViewModel<ActiveCustomerAuthorizedSharedAccountManagerAccessView>;

export const sharedAccounts = new Tables.Sync(
  "shared_accounts",
  {
    origin: Columns.union(["papercut", "internal"]).default("internal").notNull(),
    name: text().notNull(),
    reviewThreshold: numeric(),
    // NOTE: Set to -1 if the shared account is not a papercut shared account
    papercutAccountId: bigint({ mode: "number" }).notNull().default(-1),
  },
  (table) => [uniqueIndex().on(table.origin, table.name, table.papercutAccountId, table.tenantId)],
);
export const sharedAccountsTable = sharedAccounts.table;
export type SharedAccountsTable = typeof sharedAccountsTable;
export type SharedAccount = InferSelectModel<SharedAccountsTable>;
export type SharedAccountByOrigin<TSharedAccountOrigin extends SharedAccount["origin"]> =
  Discriminate<SharedAccount, "origin", TSharedAccountOrigin>;

export const activeSharedAccountsView = snakeCase
  .view(`active_${sharedAccounts.name}`)
  .as((qb) => qb.select().from(sharedAccountsTable).where(isNull(sharedAccountsTable.deletedAt)));
export type ActiveSharedAccountsView = typeof activeSharedAccountsView;
export type ActiveSharedAccount = InferSelectViewModel<ActiveSharedAccountsView>;

export const activeCustomerAuthorizedSharedAccountsView = snakeCase
  .view(`active_customer_authorized_${sharedAccounts.name}`)
  .as((qb) =>
    qb
      .select({
        ...getViewSelectedFields(activeSharedAccountsView),
        customerId: activeSharedAccountCustomerAccessView.customerId,
      })
      .from(activeSharedAccountsView)
      .innerJoin(
        activeSharedAccountCustomerAccessView,
        and(
          eq(activeSharedAccountsView.id, activeSharedAccountCustomerAccessView.sharedAccountId),
          eq(activeSharedAccountsView.tenantId, activeSharedAccountCustomerAccessView.tenantId),
        ),
      ),
  );
export type ActiveCustomerAuthorizedSharedAccountsView =
  typeof activeCustomerAuthorizedSharedAccountsView;
export type ActiveCustomerAuthorizedSharedAccount =
  InferSelectViewModel<ActiveCustomerAuthorizedSharedAccountsView>;

export const activeManagerAuthorizedSharedAccountsView = snakeCase
  .view(`active_manager_authorized_${sharedAccounts.name}`)
  .as((qb) =>
    qb
      .select({
        ...getViewSelectedFields(activeSharedAccountsView),
        managerId: activeSharedAccountManagerAccessView.managerId,
      })
      .from(activeSharedAccountsView)
      .innerJoin(
        activeSharedAccountManagerAccessView,
        and(
          eq(activeSharedAccountsView.id, activeSharedAccountManagerAccessView.sharedAccountId),
          eq(activeSharedAccountsView.tenantId, activeSharedAccountManagerAccessView.tenantId),
        ),
      ),
  );
export type ActiveManagerAuthorizedSharedAccountsView =
  typeof activeManagerAuthorizedSharedAccountsView;
export type ActiveManagerAuthorizedSharedAccount =
  InferSelectViewModel<ActiveManagerAuthorizedSharedAccountsView>;

export const sharedAccountCustomerGroupAccess = new Tables.Sync(
  `shared_account_customer_group_access`,
  {
    customerGroupId: Columns.entityId().notNull(),
    sharedAccountId: Columns.entityId().notNull(),
  },
  (table) => [
    uniqueIndex().on(table.customerGroupId, table.sharedAccountId, table.tenantId),
    index().on(table.customerGroupId),
  ],
);
export const sharedAccountCustomerGroupAccessTable = sharedAccountCustomerGroupAccess.table;
export type SharedAccountCustomerGroupAccessTable = typeof sharedAccountCustomerGroupAccessTable;
export type SharedAccountCustomerGroupAccess =
  InferSelectModel<SharedAccountCustomerGroupAccessTable>;

export const activeSharedAccountCustomerGroupAccessView = snakeCase
  .view(`active_${sharedAccountCustomerGroupAccess.name}`)
  .as((qb) =>
    qb
      .select()
      .from(sharedAccountCustomerGroupAccessTable)
      .where(isNull(sharedAccountCustomerGroupAccessTable.deletedAt)),
  );
export type ActiveSharedAccountCustomerGroupAccessView =
  typeof activeSharedAccountCustomerGroupAccessView;
export type ActiveSharedAccountCustomerGroupAccess =
  InferSelectViewModel<ActiveSharedAccountCustomerGroupAccessView>;

export const activeAuthorizedSharedAccountCustomerGroupAccessView = snakeCase
  .view(`active_authorized_${sharedAccountCustomerGroupAccess.name}`)
  .as((qb) =>
    qb
      .select({
        ...getViewSelectedFields(activeSharedAccountCustomerGroupAccessView),
        memberId: activeCustomerGroupMembershipsView.memberId,
      })
      .from(activeSharedAccountCustomerGroupAccessView)
      .innerJoin(
        activeCustomerGroupMembershipsView,
        and(
          eq(
            activeSharedAccountCustomerGroupAccessView.customerGroupId,
            activeCustomerGroupMembershipsView.customerGroupId,
          ),
          eq(
            activeSharedAccountCustomerGroupAccessView.tenantId,
            activeCustomerGroupMembershipsView.tenantId,
          ),
        ),
      ),
  );
export type ActiveAuthorizedSharedAccountCustomerGroupAccessView =
  typeof activeAuthorizedSharedAccountCustomerGroupAccessView;
export type ActiveAuthorizedSharedAccountCustomerGroupAccess =
  InferSelectViewModel<ActiveAuthorizedSharedAccountCustomerGroupAccessView>;
