import { and, eq, getViewSelectedFields, isNotNull, isNull, or } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  numeric,
  snakeCase,
  text,
  uniqueIndex,
  unique,
} from "drizzle-orm/pg-core";

import { Columns } from "../columns";
import { activeCustomerGroupMembershipsView } from "../groups/sql";
import { Tables } from "../tables";
import { SharedAccountsContract } from "./contracts";

import type { InferSelectModel, InferSelectViewModel } from "drizzle-orm";
import type { Discriminate, Prettify } from "../utils";

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
    origin: Columns.union(SharedAccountsContract.Origin.literals).default("internal").notNull(),
    name: text().$type<SharedAccountsContract.Name>().notNull(),
    reviewThreshold: numeric(),
    papercutId: bigint({ mode: "number" }).$type<SharedAccountsContract.PapercutId>(),
  },
  (table) => [
    unique().on(table.name, table.papercutId, table.tenantId),
    check(
      "origin_papercut_id",
      // oxlint-disable-next-line typescript/no-non-null-assertion
      or(
        and(
          eq(table.origin, "papercut" satisfies SharedAccountsContract.Origin),
          isNotNull(table.papercutId),
        ),
        and(
          eq(table.origin, "internal" satisfies SharedAccountsContract.Origin),
          isNull(table.papercutId),
        ),
      )!,
    ),
    index().on(table.origin, table.tenantId),
  ],
);
export const sharedAccountsTable = sharedAccounts.table;
export type SharedAccountsTable = typeof sharedAccountsTable;
export type SharedAccount = InferSelectModel<SharedAccountsTable>;
export type SharedAccountByOrigin<TSharedAccountOrigin extends SharedAccount["origin"]> = Prettify<
  Omit<Discriminate<SharedAccount, "origin", TSharedAccountOrigin>, "papercutId"> &
    (TSharedAccountOrigin extends "papercut"
      ? { papercutId: NonNullable<SharedAccount["papercutId"]> }
      : { papercutId: null })
>;

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
