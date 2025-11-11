import * as Effect from "effect/Effect";

import { Comments } from "../comments2/client";
import { Orders } from "../orders2/client";
import { Procedures } from "../procedures";
import { SharedAccounts } from "../shared-accounts2/client";
import { Users } from "../users2/client";
import { SharedAccountWorkflows } from "../workflows2/client";
import { PoliciesContract } from "./contract";

export namespace Policies {
  export class Dispatcher extends Effect.Service<Dispatcher>()(
    "@printdesk/core/policies/client/Dispatcher",
    {
      accessors: true,
      dependencies: [
        Procedures.Policies.Default,
        Comments.Policies.Default,
        Orders.Policies.Default,
        SharedAccounts.Policies.Default,
        SharedAccountWorkflows.Policies.Default,
        Users.Policies.Default,
      ],
      effect: Effect.gen(function* () {
        const procedureRegistry = yield* Procedures.Policies.registry;

        const comments = yield* Comments.Policies;
        const orders = yield* Orders.Policies;
        const sharedAccounts = yield* SharedAccounts.Policies;
        const sharedAccountWorkflows = yield* SharedAccountWorkflows.Policies;
        const users = yield* Users.Policies;

        const client = new PoliciesContract.Dispatcher({ procedureRegistry })
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
      }),
    },
  ) {}
}
