import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { PolicyDispatcher } from ".";
import { Policy } from "../..";
import { AnnouncementsPolicies } from "../../../announcements/client/policies";
import { CommentsPolicies } from "../../../comments/client/policies";
import { DeliveryOptionsPolicies } from "../../../delivery-options/client/policies";
import { GroupsPolicies } from "../../../groups/client/policies";
import { PolicyHandlers } from "../../../handlers/policies";
import { OrderObjectsPolicies } from "../../../orders/client/objects/policies";
import { OrdersPolicies } from "../../../orders/client/policies";
import { ProductsPolicies } from "../../../products/client/policies";
import { RoomsPolicies } from "../../../rooms/client/policies";
import { SharedAccountManagerAccessPolicies } from "../../../shared-accounts/client/manager-access/policies";
import { SharedAccountsPolicies } from "../../../shared-accounts/client/policies";
import { UsersPolicies } from "../../../users/client/policies";
import { SharedAccountWorkflowsPolicies } from "../../../workflows/client/shared-account/policies";
import { WorkflowStatusesPolicies } from "../../../workflows/client/status/policies";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const announcements = yield* AnnouncementsPolicies;
  const comments = yield* CommentsPolicies;
  const deliveryOptions = yield* DeliveryOptionsPolicies;
  const groups = yield* GroupsPolicies;
  const orders = yield* OrdersPolicies;
  const orderObjects = yield* OrderObjectsPolicies;
  const products = yield* ProductsPolicies;
  const rooms = yield* RoomsPolicies;
  const sharedAccounts = yield* SharedAccountsPolicies;
  const sharedAccountManagerAccess = yield* SharedAccountManagerAccessPolicies;
  const sharedAccountWorkflows = yield* SharedAccountWorkflowsPolicies;
  const users = yield* UsersPolicies;
  const workflowStatuses = yield* WorkflowStatusesPolicies;

  return new Policy.Dispatcher({ handlerRegistry: PolicyHandlers.registry })
    .policy(announcements.canEdit)
    .policy(announcements.canDelete)
    .policy(announcements.canRestore)
    .policy(comments.isAuthor)
    .policy(comments.canEdit)
    .policy(comments.canDelete)
    .policy(comments.canRestore)
    .policy(deliveryOptions.canEdit)
    .policy(deliveryOptions.canDelete)
    .policy(deliveryOptions.canRestore)
    .policy(groups.isMemberOf)
    .policy(orders.isCustomer)
    .policy(orders.isManager)
    .policy(orders.isCustomerOrManager)
    .policy(orders.isManagerAuthorized)
    .policy(orders.canEdit)
    .policy(orders.canApprove)
    .policy(orders.canTransition)
    .policy(orders.canDelete)
    .policy(orders.canRestore)
    .policy(orderObjects.canEdit)
    .policy(orderObjects.canDelete)
    .policy(products.canEdit)
    .policy(products.canDelete)
    .policy(products.canRestore)
    .policy(rooms.canEdit)
    .policy(rooms.canDelete)
    .policy(rooms.canRestore)
    .policy(sharedAccounts.isCustomerAuthorized)
    .policy(sharedAccounts.isManagerAuthorized)
    .policy(sharedAccounts.canEdit)
    .policy(sharedAccounts.canDelete)
    .policy(sharedAccounts.canRestore)
    .policy(sharedAccountManagerAccess.canDelete)
    .policy(sharedAccountManagerAccess.canRestore)
    .policy(sharedAccountWorkflows.isCustomerAuthorized)
    .policy(sharedAccountWorkflows.isManagerAuthorized)
    .policy(users.isSelf)
    .policy(users.canEdit)
    .policy(users.canDelete)
    .policy(users.canRestore)
    .policy(workflowStatuses.canEdit)
    .policy(workflowStatuses.canDelete)
    .final();
});

export const layer = makeService.pipe(Layer.effect(PolicyDispatcher));
