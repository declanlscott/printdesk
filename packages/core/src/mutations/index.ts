import * as Effect from "effect/Effect";

import { Announcements } from "../announcements2";
import { Auth } from "../auth2";
import { Comments } from "../comments2";
import { DeliveryOptions } from "../delivery-options2";
import { Invoices } from "../invoices2";
import { Orders } from "../orders2";
import { Procedures } from "../procedures";
import { Products } from "../products2";
import { Rooms } from "../rooms2";
import { SharedAccounts } from "../shared-accounts2";
import { Tenants } from "../tenants2";
import { Users } from "../users2";
import { WorkflowStatuses } from "../workflows2";
import { MutationsContract } from "./contract";

export namespace Mutations {
  export class Dispatcher extends Effect.Service<Dispatcher>()(
    "@printdesk/core/mutations/Dispatcher",
    {
      accessors: true,
      dependencies: [
        Procedures.Mutations.Default,
        Announcements.Mutations.Default,
        Comments.Mutations.Default,
        DeliveryOptions.Mutations.Default,
        Invoices.Mutations.Default,
        Orders.Mutations.Default,
        Products.Mutations.Default,
        Rooms.Mutations.Default,
        SharedAccounts.Mutations.Default,
        SharedAccounts.ManagerAuthorizationMutations.Default,
        Tenants.Mutations.Default,
        Users.Mutations.Default,
        WorkflowStatuses.Mutations.Default,
      ],
      effect: Effect.gen(function* () {
        const session = yield* Auth.Session;
        const procedures = yield* Procedures.Mutations.procedures;

        const announcements = yield* Announcements.Mutations;
        const comments = yield* Comments.Mutations;
        const deliveryOptions = yield* DeliveryOptions.Mutations;
        const invoices = yield* Invoices.Mutations;
        const orders = yield* Orders.Mutations;
        const products = yield* Products.Mutations;
        const rooms = yield* Rooms.Mutations;
        const sharedAccounts = yield* SharedAccounts.Mutations;
        const sharedAccountManagerAuthorizations =
          yield* SharedAccounts.ManagerAuthorizationMutations;
        const tenants = yield* Tenants.Mutations;
        const users = yield* Users.Mutations;
        const workflowStatuses = yield* WorkflowStatuses.Mutations;

        const client = yield* Effect.succeed(
          new MutationsContract.Dispatcher({
            session,
            procedures,
          })
            .set(announcements.create)
            .set(announcements.edit)
            .set(announcements.delete)
            .set(announcements.restore)
            .set(comments.create)
            .set(comments.edit)
            .set(comments.delete)
            .set(comments.restore)
            .set(deliveryOptions.create)
            .set(deliveryOptions.edit)
            .set(deliveryOptions.delete)
            .set(deliveryOptions.restore)
            .set(invoices.create)
            .set(orders.create)
            .set(orders.edit)
            .set(orders.approve)
            .set(orders.transitionRoomWorkflowStatus)
            .set(orders.transitionSharedAccountWorkflowStatus)
            .set(orders.delete)
            .set(orders.restore)
            .set(products.create)
            .set(products.edit)
            .set(products.publish)
            .set(products.draft)
            .set(products.delete)
            .set(products.restore)
            .set(rooms.create)
            .set(rooms.edit)
            .set(rooms.publish)
            .set(rooms.draft)
            .set(rooms.delete)
            .set(rooms.restore)
            .set(sharedAccounts.edit)
            .set(sharedAccounts.delete)
            .set(sharedAccounts.restore)
            .set(sharedAccountManagerAuthorizations.create)
            .set(sharedAccountManagerAuthorizations.delete)
            .set(sharedAccountManagerAuthorizations.restore)
            .set(tenants.edit)
            .set(users.edit)
            .set(users.delete)
            .set(users.restore)
            .set(workflowStatuses.append)
            .set(workflowStatuses.edit)
            .set(workflowStatuses.reorder)
            .set(workflowStatuses.delete)
            .done(),
        ).pipe(Effect.cached);

        return { client } as const;
      }),
    },
  ) {}
}
