import { and, eq, getViewSelectedFields, isNull } from "drizzle-orm";
import {
  bigint,
  index,
  numeric,
  pgView,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { id, pgEnum, tenantTable } from "../database2/constructors";
import {
  BillingAccountCustomerAuthorizationsContract,
  BillingAccountManagerAuthorizationsContract,
  BillingAccountsContract,
} from "./contracts";

import type { InferSelectModel, InferSelectViewModel } from "drizzle-orm";
import type { TableContract } from "../database2/contract";
import type { Discriminate } from "../utils/types";

export namespace BillingAccountsSchema {
  export const table = tenantTable(
    BillingAccountsContract.tableName,
    {
      origin: pgEnum("origin", BillingAccountsContract.origins)
        .default("internal")
        .notNull(),
      name: text("name").notNull(),
      reviewThreshold: numeric("review_threshold"),
      // NOTE: Set to -1 if the billing account is not a papercut shared account
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
  export type Table = typeof table;
  export type Row = InferSelectModel<Table>;
  export type RowByOrigin<TBillingAccountOrigin extends Row["origin"]> =
    Discriminate<Row, "origin", TBillingAccountOrigin>;

  export const activeView = pgView(BillingAccountsContract.activeViewName).as(
    (qb) => qb.select().from(table).where(isNull(table.deletedAt)),
  );
  export type ActiveView = typeof activeView;
  export type ActiveRow = InferSelectViewModel<ActiveView>;

  export const activeCustomerAuthorizedView = pgView(
    BillingAccountsContract.activeCustomerAuthorizedViewName,
  ).as((qb) =>
    qb
      .select({
        ...getViewSelectedFields(activeView),
        authorizedCustomerId:
          BillingAccountCustomerAuthorizationsSchema.activeView.customerId,
      })
      .from(activeView)
      .innerJoin(
        BillingAccountCustomerAuthorizationsSchema.activeView,
        and(
          eq(
            activeView.id,
            BillingAccountCustomerAuthorizationsSchema.activeView
              .billingAccountId,
          ),
          eq(
            activeView.tenantId,
            BillingAccountCustomerAuthorizationsSchema.activeView.tenantId,
          ),
        ),
      ),
  );
  export type ActiveCustomerAuthorizedView =
    typeof activeCustomerAuthorizedView;
  export type ActiveCustomerAuthorizedRow =
    InferSelectViewModel<ActiveCustomerAuthorizedView>;

  export const activeManagerAuthorizedView = pgView(
    BillingAccountsContract.activeManagerAuthorizedViewName,
  ).as((qb) =>
    qb
      .select({
        ...getViewSelectedFields(activeView),
        authorizedManagerId:
          BillingAccountManagerAuthorizationsSchema.activeView.managerId,
      })
      .from(activeView)
      .innerJoin(
        BillingAccountManagerAuthorizationsSchema.activeView,
        and(
          eq(
            activeView.id,
            BillingAccountManagerAuthorizationsSchema.activeView
              .billingAccountId,
          ),
          eq(
            activeView.tenantId,
            BillingAccountManagerAuthorizationsSchema.activeView.tenantId,
          ),
        ),
      ),
  );
  export type ActiveManagerAuthorizedView = typeof activeManagerAuthorizedView;
  export type ActiveManagerAuthorizedRow =
    InferSelectViewModel<ActiveManagerAuthorizedView>;
}

export namespace BillingAccountCustomerAuthorizationsSchema {
  export const table = tenantTable(
    BillingAccountCustomerAuthorizationsContract.tableName,
    {
      customerId: id<TableContract.EntityId>("customer_id").notNull(),
      billingAccountId:
        id<TableContract.EntityId>("billing_account_id").notNull(),
    },
    (table) => [
      uniqueIndex().on(
        table.customerId,
        table.billingAccountId,
        table.tenantId,
      ),
      index().on(table.customerId),
    ],
  );
  export type Table = typeof table;
  export type Row = TableContract.InferDataTransferObject<Table>;

  export const activeView = pgView(
    BillingAccountCustomerAuthorizationsContract.activeViewName,
  ).as((qb) => qb.select().from(table).where(isNull(table.deletedAt)));
  export type ActiveView = typeof activeView;
  export type ActiveRow = InferSelectViewModel<ActiveView>;
}

export namespace BillingAccountManagerAuthorizationsSchema {
  export const table = tenantTable(
    BillingAccountManagerAuthorizationsContract.tableName,
    {
      managerId: id<TableContract.EntityId>("manager_id").notNull(),
      billingAccountId:
        id<TableContract.EntityId>("billing_account_id").notNull(),
    },
    (table) => [
      uniqueIndex().on(table.billingAccountId, table.managerId, table.tenantId),
      index().on(table.managerId),
    ],
  );
  export type Table = typeof table;
  export type Row = InferSelectModel<Table>;

  export const activeView = pgView(
    BillingAccountManagerAuthorizationsContract.activeViewName,
  ).as((qb) => qb.select().from(table).where(isNull(table.deletedAt)));
  export type ActiveView = typeof activeView;
  export type ActiveRow = InferSelectViewModel<ActiveView>;

  export const activeCustomerAuthorizedView = pgView(
    BillingAccountManagerAuthorizationsContract.activeCustomerAuthorizedViewName,
  ).as((qb) =>
    qb
      .select({
        ...getViewSelectedFields(activeView),
        authorizedCustomerId:
          BillingAccountCustomerAuthorizationsSchema.activeView.customerId,
      })
      .from(activeView)
      .innerJoin(
        BillingAccountCustomerAuthorizationsSchema.activeView,
        and(
          eq(
            activeView.billingAccountId,
            BillingAccountCustomerAuthorizationsSchema.activeView
              .billingAccountId,
          ),
          eq(
            activeView.tenantId,
            BillingAccountCustomerAuthorizationsSchema.activeView.tenantId,
          ),
        ),
      ),
  );
  export type ActiveCustomerAuthorizedView =
    typeof activeCustomerAuthorizedView;
  export type ActiveCustomerAuthorizedRow =
    InferSelectViewModel<ActiveCustomerAuthorizedView>;
}
