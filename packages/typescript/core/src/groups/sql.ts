import { and, eq, getViewSelectedFields, isNull } from "drizzle-orm";
import { snakeCase, text, unique } from "drizzle-orm/pg-core";

import { Columns } from "../columns";
import { Tables } from "../tables";

import type { InferSelectModel, InferSelectViewModel } from "drizzle-orm";

export const customerGroupMemberships = new Tables.Sync("customer_group_memberships", {
  customerGroupId: Columns.entityId().notNull(),
  memberId: Columns.entityId().notNull(),
});
export const customerGroupMembershipsTable = customerGroupMemberships.table;
export type CustomerGroupMembershipsTable = typeof customerGroupMembershipsTable;
export type CustomerGroupMembership = InferSelectModel<CustomerGroupMembershipsTable>;

export const activeCustomerGroupMembershipsView = snakeCase
  .view(`active_${customerGroupMemberships.name}`)
  .as((qb) =>
    qb
      .select()
      .from(customerGroupMembershipsTable)
      .where(isNull(customerGroupMembershipsTable.deletedAt)),
  );
export type ActiveCustomerGroupMembershipsView = typeof activeCustomerGroupMembershipsView;
export type ActiveCustomerGroupMembership =
  InferSelectViewModel<ActiveCustomerGroupMembershipsView>;

export const customerGroups = new Tables.Sync(
  "customer_groups",
  {
    name: text().notNull(),
    externalId: text().notNull(),
    identityProviderId: Columns.entityId().notNull(),
  },
  (table) => [
    unique().on(table.name, table.tenantId),
    unique().on(table.externalId, table.tenantId),
  ],
);
export const customerGroupsTable = customerGroups.table;
export type CustomerGroupsTable = typeof customerGroupsTable;
export type CustomerGroup = InferSelectModel<CustomerGroupsTable>;

export const activeCustomerGroupsView = snakeCase
  .view(`active_${customerGroups.name}`)
  .as((qb) => qb.select().from(customerGroupsTable).where(isNull(customerGroupsTable.deletedAt)));
export type ActiveCustomerGroupsView = typeof activeCustomerGroupsView;
export type ActiveCustomerGroup = InferSelectViewModel<ActiveCustomerGroupsView>;

export const activeMembershipCustomerGroupsView = snakeCase
  .view(`active_membership_${customerGroups.name}`)
  .as((qb) =>
    qb
      .select({
        ...getViewSelectedFields(activeCustomerGroupsView),
        memberId: activeCustomerGroupMembershipsView.memberId,
      })
      .from(activeCustomerGroupsView)
      .innerJoin(
        activeCustomerGroupMembershipsView,
        and(
          eq(activeCustomerGroupsView.id, activeCustomerGroupMembershipsView.customerGroupId),
          eq(activeCustomerGroupsView.tenantId, activeCustomerGroupMembershipsView.tenantId),
        ),
      ),
  );
export type ActiveMembershipCustomerGroupsView = typeof activeMembershipCustomerGroupsView;
export type ActiveMembershipCustomerGroup =
  InferSelectViewModel<ActiveMembershipCustomerGroupsView>;
