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
        const procedures = yield* Procedures.Policies.procedures;

        const comments = yield* Comments.Policies;
        const orders = yield* Orders.Policies;
        const sharedAccounts = yield* SharedAccounts.Policies;
        const sharedAccountWorkflows = yield* SharedAccountWorkflows.Policies;
        const users = yield* Users.Policies;

        const client = yield* Effect.succeed(
          new PoliciesContract.Dispatcher({ procedures })
            .set(comments.isAuthor)
            .set(orders.isCustomer)
            .set(orders.isManager)
            .set(orders.isCustomerOrManager)
            .set(orders.isManagerAuthorized)
            .set(sharedAccounts.isCustomerAuthorized)
            .set(sharedAccounts.isManagerAuthorized)
            .set(sharedAccountWorkflows.isCustomerAuthorized)
            .set(sharedAccountWorkflows.isManagerAuthorized)
            .set(users.isSelf)
            .done(),
        ).pipe(Effect.cached);

        return { client } as const;
      }),
    },
  ) {}
}
