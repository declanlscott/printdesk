import * as AnnouncementsPolicies from "@printdesk/core/announcements/policies/layer";
import * as AnnouncementsRepositories from "@printdesk/core/announcements/repositories/layers";
import * as CommentsPolicies from "@printdesk/core/comments/policies/layer";
import * as CommentsRepositories from "@printdesk/core/comments/repositories/layers";
import * as DeliveryOptionsPolicies from "@printdesk/core/delivery-options/policies/layer";
import * as DeliveryOptionsRepositories from "@printdesk/core/delivery-options/repositories/layers";
import * as GroupMembershipsRepositories from "@printdesk/core/groups/memberships/repositories/layers";
import * as GroupsPolicies from "@printdesk/core/groups/policies/layer";
import * as OrdersPolicies from "@printdesk/core/orders/policies/layer";
import * as OrdersRepositories from "@printdesk/core/orders/repositories/layers";
import * as PolicyDispatcher from "@printdesk/core/policies/dispatcher/layer";
import * as ProductsPolicies from "@printdesk/core/products/policies/layer";
import * as ProductsRepositories from "@printdesk/core/products/repositories/layers";
import * as RoomsPolicies from "@printdesk/core/rooms/policies/layer";
import * as RoomsRepositories from "@printdesk/core/rooms/repositories/layers";
import * as SharedAccountManagerAccessPolicies from "@printdesk/core/shared-accounts/manager-access/policies/layer";
import * as SharedAccountManagerAccessRepositories from "@printdesk/core/shared-accounts/manager-access/repositories/layers";
import * as SharedAccountsPolicies from "@printdesk/core/shared-accounts/policies/layer";
import * as SharedAccountsRepositories from "@printdesk/core/shared-accounts/repositories/layers";
import { SstResource } from "@printdesk/core/sst/resource";
import * as UsersPolicies from "@printdesk/core/users/policies/layer";
import * as UsersRepositories from "@printdesk/core/users/repositories/layers";
import * as SharedAccountWorkflowsPolicies from "@printdesk/core/workflows/shared-account/policies/layer";
import * as SharedAccountWorkflowsRepositories from "@printdesk/core/workflows/shared-account/repositories/layers";
import * as WorkflowStatusesPolicies from "@printdesk/core/workflows/status/policies/layer";
import * as WorkflowStatusesRepositories from "@printdesk/core/workflows/status/repositories/layers";
import * as Layer from "effect/Layer";

import { databaseLayer } from "./database";

export const policyDispatcherLayer = PolicyDispatcher.layer.pipe(
  Layer.provide([
    AnnouncementsPolicies.layer,
    CommentsPolicies.layer,
    DeliveryOptionsPolicies.layer,
    GroupsPolicies.layer,
    OrdersPolicies.layer,
    ProductsPolicies.layer,
    RoomsPolicies.layer,
    SharedAccountsPolicies.layer,
    SharedAccountManagerAccessPolicies.layer,
    UsersPolicies.layer,
    WorkflowStatusesPolicies.layer,
  ]),
  Layer.provide(SharedAccountWorkflowsPolicies.layer),
  Layer.provide([
    AnnouncementsRepositories.repositoryLayer,
    CommentsRepositories.repositoryLayer,
    DeliveryOptionsRepositories.repositoryLayer,
    GroupMembershipsRepositories.repositoryLayer,
    OrdersRepositories.repositoryLayer,
    ProductsRepositories.repositoryLayer,
    RoomsRepositories.repositoryLayer,
    SharedAccountsRepositories.repositoryLayer,
    SharedAccountManagerAccessRepositories.repositoryLayer,
    SharedAccountWorkflowsRepositories.repositoryLayer,
    UsersRepositories.repositoryLayer,
    WorkflowStatusesRepositories.repositoryLayer,
  ]),
  Layer.provide([databaseLayer, SstResource.layer]),
);
