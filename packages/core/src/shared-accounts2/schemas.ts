import { and, eq, getViewSelectedFields, isNull } from "drizzle-orm";
import {
  bigint,
  index,
  numeric,
  pgView,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { Columns } from "../columns2";
import { Tables } from "../tables2";
import {
  SharedAccountCustomerAuthorizationsContract,
  SharedAccountManagerAuthorizationsContract,
  SharedAccountsContract,
} from "./contracts";

import type { InferSelectModel, InferSelectViewModel } from "drizzle-orm";
import type { Discriminate } from "../utils/types";

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
        authorizedCustomerId:
          SharedAccountCustomerAuthorizationsSchema.activeView.customerId,
      })
      .from(activeView)
      .innerJoin(
        SharedAccountCustomerAuthorizationsSchema.activeView,
        and(
          eq(
            activeView.id,
            SharedAccountCustomerAuthorizationsSchema.activeView
              .sharedAccountId,
          ),
          eq(
            activeView.tenantId,
            SharedAccountCustomerAuthorizationsSchema.activeView.tenantId,
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
        authorizedManagerId:
          SharedAccountManagerAuthorizationsSchema.activeView.managerId,
      })
      .from(activeView)
      .innerJoin(
        SharedAccountManagerAuthorizationsSchema.activeView,
        and(
          eq(
            activeView.id,
            SharedAccountManagerAuthorizationsSchema.activeView.sharedAccountId,
          ),
          eq(
            activeView.tenantId,
            SharedAccountManagerAuthorizationsSchema.activeView.tenantId,
          ),
        ),
      ),
  );
  export type ActiveManagerAuthorizedView = typeof activeManagerAuthorizedView;
  export type ActiveManagerAuthorizedRow =
    InferSelectViewModel<ActiveManagerAuthorizedView>;
}

export namespace SharedAccountCustomerAuthorizationsSchema {
  export const table = new Tables.Sync(
    SharedAccountCustomerAuthorizationsContract.tableName,
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
    SharedAccountCustomerAuthorizationsContract.activeViewName,
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

export namespace SharedAccountManagerAuthorizationsSchema {
  export const table = new Tables.Sync(
    SharedAccountManagerAuthorizationsContract.tableName,
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
    SharedAccountManagerAuthorizationsContract.activeViewName,
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
    SharedAccountManagerAuthorizationsContract.activeCustomerAuthorizedViewName,
  ).as((qb) =>
    qb
      .select({
        ...getViewSelectedFields(activeView),
        authorizedCustomerId:
          SharedAccountCustomerAuthorizationsSchema.activeView.customerId,
      })
      .from(activeView)
      .innerJoin(
        SharedAccountCustomerAuthorizationsSchema.activeView,
        and(
          eq(
            activeView.sharedAccountId,
            SharedAccountCustomerAuthorizationsSchema.activeView
              .sharedAccountId,
          ),
          eq(
            activeView.tenantId,
            SharedAccountCustomerAuthorizationsSchema.activeView.tenantId,
          ),
        ),
      ),
  );
  export type ActiveCustomerAuthorizedView =
    typeof activeCustomerAuthorizedView;
  export type ActiveCustomerAuthorizedRow =
    InferSelectViewModel<ActiveCustomerAuthorizedView>;
}
