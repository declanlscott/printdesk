import * as AnnouncementsMutations from "@printdesk/core/announcements/mutations/layer";
import * as AnnouncementsPolicies from "@printdesk/core/announcements/policies/layer";
import * as AnnouncementsRepositories from "@printdesk/core/announcements/repositories/layers";
import * as AnnouncementsSync from "@printdesk/core/announcements/sync/layer";
import * as CommentsMutations from "@printdesk/core/comments/mutations/layer";
import * as CommentsPolicies from "@printdesk/core/comments/policies/layer";
import * as CommentsRepositories from "@printdesk/core/comments/repositories/layers";
import * as CommentsSync from "@printdesk/core/comments/sync/layer";
import * as DeliveryOptionsMutations from "@printdesk/core/delivery-options/mutations/layer";
import * as DeliveryOptionsPolicies from "@printdesk/core/delivery-options/policies/layer";
import * as DeliveryOptionsRepositories from "@printdesk/core/delivery-options/repositories/layers";
import * as DeliveryOptionsSync from "@printdesk/core/delivery-options/sync/layer";
import * as GroupMembershipsRepositories from "@printdesk/core/groups/memberships/repositories/layers";
import * as GroupMembershipsSync from "@printdesk/core/groups/memberships/sync/layer";
import * as GroupsRepositories from "@printdesk/core/groups/repositories/layers";
import * as GroupsSync from "@printdesk/core/groups/sync/layer";
import * as InvoicesMutations from "@printdesk/core/invoices/mutations/layer";
import * as InvoicesRepositories from "@printdesk/core/invoices/repositories/layers";
import * as InvoicesSync from "@printdesk/core/invoices/sync/layer";
import * as MutationsDispatcher from "@printdesk/core/mutations/dispatcher/layer";
import * as OrdersMutations from "@printdesk/core/orders/mutations/layer";
import * as OrdersPolicies from "@printdesk/core/orders/policies/layer";
import * as OrdersRepositories from "@printdesk/core/orders/repositories/layers";
import * as OrdersShortIdGenerator from "@printdesk/core/orders/short-id-generator/layer";
import * as OrdersSync from "@printdesk/core/orders/sync/layer";
import * as ProductsMutations from "@printdesk/core/products/mutations/layer";
import * as ProductsPolicies from "@printdesk/core/products/policies/layer";
import * as ProductsRepositories from "@printdesk/core/products/repositories/layers";
import * as ProductsSync from "@printdesk/core/products/sync/layer";
import * as ReplicacheNotifier from "@printdesk/core/replicache/notifier/layer";
import * as ReplicachePuller from "@printdesk/core/replicache/puller/layer";
import * as ReplicachePusher from "@printdesk/core/replicache/pusher/layer";
import * as ReplicacheClientGroupsRepository from "@printdesk/core/replicache/repositories/client-groups/layer";
import * as ReplicacheClientViewEntriesRepository from "@printdesk/core/replicache/repositories/client-view-entries/layer";
import * as ReplicacheClientViewsRepository from "@printdesk/core/replicache/repositories/client-views/layer";
import * as ReplicacheClientsRepository from "@printdesk/core/replicache/repositories/clients/layer";
import * as RoomsMutations from "@printdesk/core/rooms/mutations/layer";
import * as RoomsPolicies from "@printdesk/core/rooms/policies/layer";
import * as RoomsRepositories from "@printdesk/core/rooms/repositories/layers";
import * as RoomsSync from "@printdesk/core/rooms/sync/layer";
import * as SharedAccountCustomerAccessRepositories from "@printdesk/core/shared-accounts/customer-access/repositories/layers";
import * as SharedAccountCustomerAccessSync from "@printdesk/core/shared-accounts/customer-access/sync/layer";
import * as SharedAccountGroupCustomerAccessRepositories from "@printdesk/core/shared-accounts/group-customer-access/repositories/layers";
import * as SharedAccountGroupCustomerAccessSync from "@printdesk/core/shared-accounts/group-customer-access/sync/layer";
import * as SharedAccountManagerAccessMutations from "@printdesk/core/shared-accounts/manager-access/mutations/layer";
import * as SharedAccountManagerAccessPolicies from "@printdesk/core/shared-accounts/manager-access/policies/layer";
import * as SharedAccountManagerAccessRepositories from "@printdesk/core/shared-accounts/manager-access/repositories/layers";
import * as SharedAccountManagerAccessSync from "@printdesk/core/shared-accounts/manager-access/sync/layer";
import * as SharedAccountsMutations from "@printdesk/core/shared-accounts/mutations/layer";
import * as SharedAccountsPolicies from "@printdesk/core/shared-accounts/policies/layer";
import * as SharedAccountsRepositories from "@printdesk/core/shared-accounts/repositories/layers";
import * as SharedAccountsSync from "@printdesk/core/shared-accounts/sync/layer";
import { SstResource } from "@printdesk/core/sst/resource";
import * as SyncQueryBuilder from "@printdesk/core/sync/query-builder/layer";
import * as Synchronizer from "@printdesk/core/sync/synchronizer/layer";
import * as TenantsMutations from "@printdesk/core/tenants/mutations/layer";
import * as TenantsRepositories from "@printdesk/core/tenants/repositories/layers";
import * as TenantsSync from "@printdesk/core/tenants/sync/layer";
import * as UsersMutations from "@printdesk/core/users/mutations/layer";
import * as UsersPolicies from "@printdesk/core/users/policies/layer";
import * as UsersRepositories from "@printdesk/core/users/repositories/layers";
import * as UsersSync from "@printdesk/core/users/sync/layer";
import * as RoomWorkflowsRepositories from "@printdesk/core/workflows/room/repositories/layers";
import * as RoomWorkflowsSync from "@printdesk/core/workflows/room/sync/layer";
import * as SharedAccountWorkflowsPolicies from "@printdesk/core/workflows/shared-account/policies/layer";
import * as SharedAccountWorkflowsRepositories from "@printdesk/core/workflows/shared-account/repositories/layers";
import * as SharedAccountWorkflowsSync from "@printdesk/core/workflows/shared-account/sync/layer";
import * as WorkflowStatusesMutations from "@printdesk/core/workflows/status/mutations/layer";
import * as WorkflowStatusesPolicies from "@printdesk/core/workflows/status/policies/layer";
import * as WorkflowStatusesRepositories from "@printdesk/core/workflows/status/repositories/layers";
import * as WorkflowStatusesSync from "@printdesk/core/workflows/status/sync/layer";
import * as Layer from "effect/Layer";

import { databaseLayer, dynamoLayer } from "./database";
import { realtimeLayer } from "./realtime";

export const replicacheLayer = ReplicachePuller.layer.pipe(
  Layer.merge(ReplicachePusher.layer),
  Layer.provide(Synchronizer.layer),
  Layer.provide([
    AnnouncementsSync.layer,
    CommentsSync.layer,
    DeliveryOptionsSync.layer,
    GroupsSync.layer,
    GroupMembershipsSync.layer,
    InvoicesSync.layer,
    OrdersSync.layer,
    ProductsSync.layer,
    RoomsSync.layer,
    SharedAccountsSync.layer,
    SharedAccountCustomerAccessSync.layer,
    SharedAccountGroupCustomerAccessSync.layer,
    SharedAccountManagerAccessSync.layer,
    TenantsSync.layer,
    UsersSync.layer,
    RoomWorkflowsSync.layer,
    SharedAccountWorkflowsSync.layer,
    WorkflowStatusesSync.layer,
  ]),
  Layer.provide(MutationsDispatcher.layer),
  Layer.provide([
    AnnouncementsMutations.layer,
    CommentsMutations.layer,
    DeliveryOptionsMutations.layer,
    InvoicesMutations.layer,
    OrdersMutations.layer,
    ProductsMutations.layer,
    RoomsMutations.layer,
    SharedAccountsMutations.layer,
    SharedAccountManagerAccessMutations.layer,
    TenantsMutations.layer,
    UsersMutations.layer,
    WorkflowStatusesMutations.layer,
  ]),
  Layer.provide([
    AnnouncementsPolicies.layer,
    CommentsPolicies.layer,
    DeliveryOptionsPolicies.layer,
    OrdersPolicies.layer,
    ProductsPolicies.layer,
    RoomsPolicies.layer,
    SharedAccountsPolicies.layer,
    SharedAccountManagerAccessPolicies.layer,
    UsersPolicies.layer,
    WorkflowStatusesPolicies.layer,
  ]),
  Layer.provide([SharedAccountWorkflowsPolicies.layer, ReplicacheNotifier.layer]),
  Layer.provide(realtimeLayer),
  Layer.provide([
    AnnouncementsRepositories.layer,
    CommentsRepositories.layer,
    DeliveryOptionsRepositories.layer,
    GroupsRepositories.layer,
    GroupMembershipsRepositories.layer,
    InvoicesRepositories.layer,
    OrdersRepositories.layer,
    ProductsRepositories.layer,
    RoomsRepositories.layer,
    SharedAccountsRepositories.layer,
    SharedAccountCustomerAccessRepositories.layer,
    SharedAccountGroupCustomerAccessRepositories.layer,
    SharedAccountManagerAccessRepositories.layer,
    TenantsRepositories.layer,
    UsersRepositories.layer,
    RoomWorkflowsRepositories.layer,
    SharedAccountWorkflowsRepositories.layer,
    WorkflowStatusesRepositories.layer,
    ReplicacheClientGroupsRepository.layer,
    ReplicacheClientsRepository.layer,
    ReplicacheClientViewsRepository.layer,
    ReplicacheClientViewEntriesRepository.layer,
  ]),
  Layer.provide([OrdersShortIdGenerator.layer, SyncQueryBuilder.layer]),
  Layer.provide([databaseLayer, dynamoLayer, SstResource.layer]),
);
