import { Effect } from "effect";

import { Announcements } from "../announcements2/client";
import { Auth } from "../auth2";
import { BillingAccounts } from "../billing-accounts2/client";
import { Comments } from "../comments2/client";
import { Invoices } from "../invoices2/client";
import { Orders } from "../orders2/client";
import { Products } from "../products2/client";
import { Rooms } from "../rooms2/client";
import { Tenants } from "../tenants2/client";
import { Users } from "../users2";
import { DataAccessContract } from "./contract";
import { Mutations, Policies } from "./functions";

export namespace DataAccess {
  export class ClientPolicies extends Effect.Service<ClientPolicies>()(
    "@printdesk/core/data-access/ClientPolicies",
    {
      accessors: true,
      dependencies: [Policies.Default],
      effect: Effect.gen(function* () {
        const functions = yield* Policies.functions;

        const billingAccounts = yield* BillingAccounts.Policies;
        const comments = yield* Comments.Policies;
        const orders = yield* Orders.Policies;
        const users = yield* Users.Policies;

        const dispatcher = yield* Effect.succeed(
          new DataAccessContract.PolicyDispatcher({ functions })
            .set(billingAccounts.hasActiveCustomerAuthorization)
            .set(billingAccounts.hasActiveManagerAuthorization)
            .set(billingAccounts.hasActiveAuthorization)
            .set(comments.isAuthor)
            .set(orders.isCustomer)
            .set(orders.isManager)
            .set(orders.isCustomerOrManager)
            .set(orders.hasActiveManagerAuthorization)
            .set(orders.canEdit)
            .set(orders.canApprove)
            .set(orders.canTransition)
            .set(orders.canDelete)
            .set(users.isSelf)
            .done(),
        ).pipe(Effect.cached);

        return { dispatcher } as const;
      }),
    },
  ) {}

  export class ClientMutations extends Effect.Service<ClientMutations>()(
    "@printdesk/core/data-access/ClientMutations",
    {
      accessors: true,
      dependencies: [
        Mutations.Default,
        Announcements.Mutations.Default,
        BillingAccounts.Mutations.Default,
        BillingAccounts.ManagerAuthorizationMutations.Default,
        Comments.Mutations.Default,
        Rooms.DeliveryOptionsMutations.Default,
        Invoices.Mutations.Default,
        Orders.Mutations.Default,
        Products.Mutations.Default,
        Rooms.Mutations.Default,
        Tenants.Mutations.Default,
        Users.Mutations.Default,
        Rooms.WorkflowMutations.Default,
      ],
      effect: Effect.gen(function* () {
        const session = yield* Auth.Session;
        const functions = yield* Mutations.functions;

        const announcements = yield* Announcements.Mutations;
        const billingAccounts = yield* BillingAccounts.Mutations;
        const billingAccountManagerAuthorizations =
          yield* BillingAccounts.ManagerAuthorizationMutations;
        const comments = yield* Comments.Mutations;
        const deliveryOptions = yield* Rooms.DeliveryOptionsMutations;
        const invoices = yield* Invoices.Mutations;
        const orders = yield* Orders.Mutations;
        const products = yield* Products.Mutations;
        const rooms = yield* Rooms.Mutations;
        const tenants = yield* Tenants.Mutations;
        const users = yield* Users.Mutations;
        const workflow = yield* Rooms.WorkflowMutations;

        const dispatcher = yield* Effect.succeed(
          new DataAccessContract.MutationDispatcher({ session, functions })
            .set(announcements.create)
            .set(announcements.update)
            .set(announcements.delete)
            .set(billingAccounts.update)
            .set(billingAccounts.delete)
            .set(billingAccountManagerAuthorizations.create)
            .set(billingAccountManagerAuthorizations.delete)
            .set(comments.create)
            .set(comments.update)
            .set(comments.delete)
            .set(deliveryOptions.set)
            .set(invoices.create)
            .set(orders.create)
            .set(orders.edit)
            .set(orders.approve)
            .set(orders.transition)
            .set(orders.delete)
            .set(products.create)
            .set(products.update)
            .set(products.delete)
            .set(rooms.create)
            .set(rooms.update)
            .set(rooms.delete)
            .set(rooms.restore)
            .set(tenants.update)
            .set(users.update)
            .set(users.delete)
            .set(users.restore)
            .set(workflow.set)
            .done(),
        ).pipe(Effect.cached);

        return { dispatcher } as const;
      }),
    },
  ) {}
}
