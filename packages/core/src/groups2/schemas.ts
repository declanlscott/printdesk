import { and, eq, getViewSelectedFields, isNull } from "drizzle-orm";
import { index, pgView, text, unique, uniqueIndex } from "drizzle-orm/pg-core";

import { Columns } from "../columns2";
import { Tables } from "../tables2";
import {
  CustomerGroupMembershipsContract,
  CustomerGroupsContract,
} from "./contracts";

import type { InferSelectModel, InferSelectViewModel } from "drizzle-orm";

export namespace CustomerGroupsSchema {
  export const table = new Tables.Sync(
    CustomerGroupsContract.tableName,
    {
      name: text().notNull(),
      externalId: text().notNull(),
      identityProviderId: Columns.entityId.notNull(),
    },
    (table) => [
      uniqueIndex().on(table.name, table.tenantId),
      unique().on(table.externalId, table.tenantId),
      index().on(table.externalId),
      index().on(table.identityProviderId),
    ],
  );
  export type Table = typeof table.definition;
  export type Row = InferSelectModel<Table>;

  export const activeView = pgView(CustomerGroupsContract.activeViewName).as(
    (qb) =>
      qb
        .select()
        .from(table.definition)
        .where(isNull(table.definition.deletedAt)),
  );
  export type ActiveView = typeof activeView;
  export type ActiveRow = InferSelectViewModel<ActiveView>;

  export const activeMembershipView = pgView(
    CustomerGroupsContract.activeMembershipViewName,
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
            activeView.id,
            CustomerGroupMembershipsSchema.activeView.customerGroupId,
          ),
          eq(
            activeView.tenantId,
            CustomerGroupMembershipsSchema.activeView.tenantId,
          ),
        ),
      ),
  );
  export type ActiveMembershipView = typeof activeMembershipView;
  export type ActiveMembershipRow = InferSelectViewModel<ActiveMembershipView>;
}

export namespace CustomerGroupMembershipsSchema {
  export const table = new Tables.Sync(
    CustomerGroupMembershipsContract.tableName,
    {
      customerGroupId: Columns.entityId.notNull(),
      memberId: Columns.entityId.notNull(),
    },
  );
  export type Table = typeof table.definition;
  export type Row = InferSelectModel<Table>;

  export const activeView = pgView(
    CustomerGroupMembershipsContract.activeViewName,
  ).as((qb) =>
    qb
      .select()
      .from(table.definition)
      .where(isNull(table.definition.deletedAt)),
  );
  export type ActiveView = typeof activeView;
  export type ActiveRow = InferSelectViewModel<ActiveView>;
}
