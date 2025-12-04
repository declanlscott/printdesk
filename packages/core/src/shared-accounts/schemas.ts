import { and, eq, getViewSelectedFields, isNull } from "drizzle-orm";
import {
  bigint,
  index,
  numeric,
  pgView,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { Columns } from "../columns";
import { CustomerGroupMembershipsSchema } from "../groups/schemas";
import { Tables } from "../tables";
import {
  SharedAccountCustomerAccessContract,
  SharedAccountCustomerGroupAccessContract,
  SharedAccountManagerAccessContract,
  SharedAccountsContract,
} from "./contracts";

import type { InferSelectModel, InferSelectViewModel } from "drizzle-orm";
import type { Discriminate } from "../utils";

export namespace SharedAccountsSchema {
  export const table = new Tables.Sync(
    SharedAccountsContract.tableName,
    {
      origin: Columns.union(SharedAccountsContract.origins)
        .default("internal")
        .notNull(),
      name: text().notNull(),
      reviewThreshold: numeric(),
      // NOTE: Set to -1 if the shared account is not a papercut shared account
      papercutAccountId: bigint({ mode: "number" }).notNull().default(-1),
    },
    (table) => [
      uniqueIndex().on(
        table.origin,
        table.name,
        table.papercutAccountId,
        table.tenantId,
      ),
    ],
  );
  export type Table = typeof table.definition;
  export type Row = InferSelectModel<Table>;
  export type RowByOrigin<TSharedAccountOrigin extends Row["origin"]> =
    Discriminate<Row, "origin", TSharedAccountOrigin>;

  export const activeView = pgView(SharedAccountsContract.activeViewName).as(
    (qb) =>
      qb
        .select()
        .from(table.definition)
        .where(isNull(table.definition.deletedAt)),
  );
  export type ActiveView = typeof activeView;
  export type ActiveRow = InferSelectViewModel<ActiveView>;

  export const activeCustomerAuthorizedView = pgView(
    SharedAccountsContract.activeCustomerAuthorizedViewName,
  ).as((qb) =>
    qb
      .select({
        ...getViewSelectedFields(activeView),
        customerId: SharedAccountCustomerAccessSchema.activeView.customerId,
      })
      .from(activeView)
      .innerJoin(
        SharedAccountCustomerAccessSchema.activeView,
        and(
          eq(
            activeView.id,
            SharedAccountCustomerAccessSchema.activeView.sharedAccountId,
          ),
          eq(
            activeView.tenantId,
            SharedAccountCustomerAccessSchema.activeView.tenantId,
          ),
        ),
      ),
  );
  export type ActiveCustomerAuthorizedView =
    typeof activeCustomerAuthorizedView;
  export type ActiveCustomerAuthorizedRow =
    InferSelectViewModel<ActiveCustomerAuthorizedView>;

  export const activeManagerAuthorizedView = pgView(
    SharedAccountsContract.activeManagerAuthorizedViewName,
  ).as((qb) =>
    qb
      .select({
        ...getViewSelectedFields(activeView),
        managerId: SharedAccountManagerAccessSchema.activeView.managerId,
      })
      .from(activeView)
      .innerJoin(
        SharedAccountManagerAccessSchema.activeView,
        and(
          eq(
            activeView.id,
            SharedAccountManagerAccessSchema.activeView.sharedAccountId,
          ),
          eq(
            activeView.tenantId,
            SharedAccountManagerAccessSchema.activeView.tenantId,
          ),
        ),
      ),
  );
  export type ActiveManagerAuthorizedView = typeof activeManagerAuthorizedView;
  export type ActiveManagerAuthorizedRow =
    InferSelectViewModel<ActiveManagerAuthorizedView>;
}

export namespace SharedAccountCustomerAccessSchema {
  export const table = new Tables.Sync(
    SharedAccountCustomerAccessContract.tableName,
    {
      customerId: Columns.entityId.notNull(),
      sharedAccountId: Columns.entityId.notNull(),
    },
    (table) => [
      uniqueIndex().on(table.customerId, table.sharedAccountId, table.tenantId),
      index().on(table.customerId),
    ],
  );
  export type Table = typeof table.definition;
  export type Row = InferSelectModel<Table>;

  export const activeView = pgView(
    SharedAccountCustomerAccessContract.activeViewName,
  ).as((qb) =>
    qb
      .select()
      .from(table.definition)
      .where(isNull(table.definition.deletedAt)),
  );
  export type ActiveView = typeof activeView;
  export type ActiveRow = InferSelectViewModel<ActiveView>;

  export const activeAuthorizedView = activeView;
  export type ActiveAuthorizedView = typeof activeAuthorizedView;
  export type ActiveAuthorizedRow = InferSelectViewModel<ActiveAuthorizedView>;
}

export namespace SharedAccountManagerAccessSchema {
  export const table = new Tables.Sync(
    SharedAccountManagerAccessContract.tableName,
    {
      managerId: Columns.entityId.notNull(),
      sharedAccountId: Columns.entityId.notNull(),
    },
    (table) => [
      uniqueIndex().on(table.sharedAccountId, table.managerId, table.tenantId),
      index().on(table.managerId),
    ],
  );
  export type Table = typeof table.definition;
  export type Row = InferSelectModel<Table>;

  export const activeView = pgView(
    SharedAccountManagerAccessContract.activeViewName,
  ).as((qb) =>
    qb
      .select()
      .from(table.definition)
      .where(isNull(table.definition.deletedAt)),
  );
  export type ActiveView = typeof activeView;
  export type ActiveRow = InferSelectViewModel<ActiveView>;

  export const activeAuthorizedView = activeView;
  export type ActiveAuthorizedView = typeof activeAuthorizedView;
  export type ActiveAuthorizedRow = InferSelectViewModel<ActiveAuthorizedView>;

  export const activeCustomerAuthorizedView = pgView(
    SharedAccountManagerAccessContract.activeCustomerAuthorizedViewName,
  ).as((qb) =>
    qb
      .select({
        ...getViewSelectedFields(activeView),
        customerId: SharedAccountCustomerAccessSchema.activeView.customerId,
      })
      .from(activeView)
      .innerJoin(
        SharedAccountCustomerAccessSchema.activeView,
        and(
          eq(
            activeView.sharedAccountId,
            SharedAccountCustomerAccessSchema.activeView.sharedAccountId,
          ),
          eq(
            activeView.tenantId,
            SharedAccountCustomerAccessSchema.activeView.tenantId,
          ),
        ),
      ),
  );
  export type ActiveCustomerAuthorizedView =
    typeof activeCustomerAuthorizedView;
  export type ActiveCustomerAuthorizedRow =
    InferSelectViewModel<ActiveCustomerAuthorizedView>;
}

export namespace SharedAccountCustomerGroupAccessSchema {
  export const table = new Tables.Sync(
    SharedAccountCustomerGroupAccessContract.tableName,
    {
      customerGroupId: Columns.entityId.notNull(),
      sharedAccountId: Columns.entityId.notNull(),
    },
    (table) => [
      uniqueIndex().on(
        table.customerGroupId,
        table.sharedAccountId,
        table.tenantId,
      ),
      index().on(table.customerGroupId),
    ],
  );
  export type Table = typeof table.definition;
  export type Row = InferSelectModel<Table>;

  export const activeView = pgView(
    SharedAccountCustomerGroupAccessContract.activeViewName,
  ).as((qb) =>
    qb
      .select()
      .from(table.definition)
      .where(isNull(table.definition.deletedAt)),
  );
  export type ActiveView = typeof activeView;
  export type ActiveRow = InferSelectViewModel<ActiveView>;

  export const activeAuthorizedView = pgView(
    SharedAccountCustomerGroupAccessContract.activeAuthorizedViewName,
  ).as((qb) =>
    qb
      .select({
        ...getViewSelectedFields(activeView),
        memberId: CustomerGroupMembershipsSchema.activeView.memberId,
      })
      .from(activeView)
      .innerJoin(
        CustomerGroupMembershipsSchema.activeView,
        and(
          eq(
            activeView.customerGroupId,
            CustomerGroupMembershipsSchema.activeView.customerGroupId,
          ),
          eq(
            activeView.tenantId,
            CustomerGroupMembershipsSchema.activeView.tenantId,
          ),
        ),
      ),
  );
  export type ActiveAuthorizedView = typeof activeAuthorizedView;
  export type ActiveAuthorizedRow = InferSelectViewModel<ActiveAuthorizedView>;
}
