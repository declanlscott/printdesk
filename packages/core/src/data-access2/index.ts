import { Effect } from "effect";

import { Announcements } from "../announcements2";
import { Auth } from "../auth2";
import { BillingAccounts } from "../billing-accounts2";
import { Comments } from "../comments2";
import { Invoices } from "../invoices2";
import { Orders } from "../orders2";
import { Products } from "../products2";
import { Rooms } from "../rooms2";
import { Tenants } from "../tenants2";
import { Users } from "../users2";
import { DataAccessContract } from "./contract";
import { Mutations } from "./functions";

export namespace DataAccess {
  export class ServerMutations extends Effect.Service<ServerMutations>()(
    "@printdesk/core/data-access/ServerMutations",
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
          new DataAccessContract.MutationDispatcher({
            session,
            functions,
          })
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
