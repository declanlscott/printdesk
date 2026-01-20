import { and, eq, getViewSelectedFields, isNull } from "drizzle-orm";
import { index, pgView, text, unique, uniqueIndex } from "drizzle-orm/pg-core";

import { Columns } from "../columns";
import { Tables } from "../tables";

import type { InferSelectModel, InferSelectViewModel } from "drizzle-orm";

export namespace CustomerGroupsSchema {
  export const table = new Tables.Sync(
    "customer_groups",
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

  export const activeView = pgView(`active_${table.name}`).as((qb) =>
    qb
      .select()
      .from(table.definition)
      .where(isNull(table.definition.deletedAt)),
  );
  export type ActiveView = typeof activeView;
  export type ActiveRow = InferSelectViewModel<ActiveView>;

  export const activeMembershipView = pgView(
    `active_membership_${table.name}`,
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
  export const table = new Tables.Sync("customer_group_memberships", {
    customerGroupId: Columns.entityId.notNull(),
    memberId: Columns.entityId.notNull(),
  });
  export type Table = typeof table.definition;
  export type Row = InferSelectModel<Table>;

  export const activeView = pgView(`active_${table.name}`).as((qb) =>
    qb
      .select()
      .from(table.definition)
      .where(isNull(table.definition.deletedAt)),
  );
  export type ActiveView = typeof activeView;
  export type ActiveRow = InferSelectViewModel<ActiveView>;
}
