import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { PoliciesDispatcher } from ".";
import { CommentsPolicies } from "../../../comments/client/policies";
import { OrdersPolicies } from "../../../orders/client/policies";
import { Policies } from "../../../procedures/policies";
import { SharedAccountsPolicies } from "../../../shared-accounts/client/policies";
import { UsersPolicies } from "../../../users/client/policies";
import { SharedAccountWorkflowsPolicies } from "../../../workflows/client/shared-account/policies";
import { PoliciesContract } from "../../contract";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const comments = yield* CommentsPolicies;
  const orders = yield* OrdersPolicies;
  const sharedAccounts = yield* SharedAccountsPolicies;
  const sharedAccountWorkflows = yield* SharedAccountWorkflowsPolicies;
  const users = yield* UsersPolicies;

  const client = new PoliciesContract.Dispatcher({ procedureRegistry: Policies.registry })
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

  return { client } as const;
});

export const layer = makeService.pipe(Layer.effect(PoliciesDispatcher));
