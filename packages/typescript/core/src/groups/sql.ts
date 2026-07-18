import { and, eq, getViewSelectedFields, isNull } from "drizzle-orm";
import { snakeCase, text, unique, uniqueIndex } from "drizzle-orm/pg-core";

import { Columns } from "../columns";
import { Tables } from "../tables";
import { GroupsContract } from "./contracts";

import type { InferSelectModel, InferSelectViewModel } from "drizzle-orm";

export const groupMemberships = new Tables.Sync(
  "group_memberships",
  {
    groupId: Columns.entityId().notNull(),
    userId: Columns.entityId().notNull(),
  },
  (table) => [uniqueIndex().on(table.groupId, table.userId, table.tenantId)],
);
export const groupMembershipsTable = groupMemberships.table;
export type GroupMembershipsTable = typeof groupMembershipsTable;
export type GroupMembership = InferSelectModel<GroupMembershipsTable>;

export const activeGroupMembershipsView = snakeCase
  .view(`active_${groupMemberships.name}`)
  .as((qb) =>
    qb.select().from(groupMembershipsTable).where(isNull(groupMembershipsTable.deletedAt)),
  );
export type ActiveGroupMembershipsView = typeof activeGroupMembershipsView;
export type ActiveGroupMembership = InferSelectViewModel<ActiveGroupMembershipsView>;

export const groups = new Tables.Sync(
  "groups",
  {
    name: text().$type<GroupsContract.Name>().notNull(),
    externalId: text().$type<GroupsContract.ExternalId>().notNull(),
    identityProviderId: Columns.entityId().notNull(),
  },
  (table) => [
    unique().on(table.name, table.tenantId),
    unique().on(table.externalId, table.tenantId),
  ],
);
export const groupsTable = groups.table;
export type GroupsTable = typeof groupsTable;
export type Group = InferSelectModel<GroupsTable>;

export const activeGroupsView = snakeCase
  .view(`active_${groups.name}`)
  .as((qb) => qb.select().from(groupsTable).where(isNull(groupsTable.deletedAt)));
export type ActiveGroupsView = typeof activeGroupsView;
export type ActiveGroup = InferSelectViewModel<ActiveGroupsView>;

export const activeMembershipGroupsView = snakeCase
  .view(`active_membership_${groups.name}`)
  .as((qb) =>
    qb
      .select({
        ...getViewSelectedFields(activeGroupsView),
        userId: activeGroupMembershipsView.userId,
      })
      .from(activeGroupsView)
      .innerJoin(
        activeGroupMembershipsView,
        and(
          eq(activeGroupsView.id, activeGroupMembershipsView.groupId),
          eq(activeGroupsView.tenantId, activeGroupMembershipsView.tenantId),
        ),
      ),
  );
export type ActiveMembershipGroupsView = typeof activeMembershipGroupsView;
export type ActiveMembershipGroup = InferSelectViewModel<ActiveMembershipGroupsView>;
