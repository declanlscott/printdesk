import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { PolicyDispatcher } from ".";
import { Policy } from "../..";
import { CommentsPolicies } from "../../../comments/client/policies";
import { PolicyHandlers } from "../../../handlers/policies";
import { OrdersPolicies } from "../../../orders/client/policies";
import { SharedAccountsPolicies } from "../../../shared-accounts/client/policies";
import { UsersPolicies } from "../../../users/client/policies";
import { SharedAccountWorkflowsPolicies } from "../../../workflows/client/shared-account/policies";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const comments = yield* CommentsPolicies;
  const orders = yield* OrdersPolicies;
  const sharedAccounts = yield* SharedAccountsPolicies;
  const sharedAccountWorkflows = yield* SharedAccountWorkflowsPolicies;
  const users = yield* UsersPolicies;

  return new Policy.Dispatcher({ handlerRegistry: PolicyHandlers.registry })
    .policy(comments.isAuthor)
    .policy(orders.isCustomer)
    .policy(orders.isManager)
    .policy(orders.isCustomerOrManager)
    .policy(orders.isManagerAuthorized)
    .policy(sharedAccounts.isCustomerAuthorized)
    .policy(sharedAccounts.isManagerAuthorized)
    .policy(sharedAccountWorkflows.isCustomerAuthorized)
    .policy(sharedAccountWorkflows.isManagerAuthorized)
    .policy(users.isSelf)
    .final();
});

export const layer = makeService.pipe(Layer.effect(PolicyDispatcher));
