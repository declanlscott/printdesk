import * as Effect from "effect/Effect";

import { Announcements } from "../announcements2/client";
import { Comments } from "../comments2/client";
import { DeliveryOptions } from "../delivery-options2/client";
import { Invoices } from "../invoices2/client";
import { Orders } from "../orders2/client";
import { Procedures } from "../procedures";
import { Products } from "../products2/client";
import { Rooms } from "../rooms2/client";
import { SharedAccounts } from "../shared-accounts2/client";
import { Tenants } from "../tenants2/client";
import { Users } from "../users2/client";
import { WorkflowStatuses } from "../workflows2/client";
import { MutationsContract } from "./contract";

export namespace Mutations {
  export class Dispatcher extends Effect.Service<Dispatcher>()(
    "@printdesk/core/mutations/client/Dispatcher",
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
        SharedAccounts.ManagerAccessMutations.Default,
        Tenants.Mutations.Default,
        Users.Mutations.Default,
        WorkflowStatuses.Mutations.Default,
      ],
      effect: Effect.gen(function* () {
        const procedureRegistry = yield* Procedures.Mutations.registry;

        const announcements = yield* Announcements.Mutations;
        const comments = yield* Comments.Mutations;
        const deliveryOptions = yield* DeliveryOptions.Mutations;
        const invoices = yield* Invoices.Mutations;
        const orders = yield* Orders.Mutations;
        const products = yield* Products.Mutations;
        const rooms = yield* Rooms.Mutations;
        const sharedAccounts = yield* SharedAccounts.Mutations;
        const sharedAccountManagerAccess =
          yield* SharedAccounts.ManagerAccessMutations;
        const tenants = yield* Tenants.Mutations;
        const users = yield* Users.Mutations;
        const workflowStatuses = yield* WorkflowStatuses.Mutations;

        const client = new MutationsContract.Dispatcher({
          procedureRegistry,
        })
          .mutation(announcements.create)
          .mutation(announcements.edit)
          .mutation(announcements.delete)
          .mutation(announcements.restore)
          .mutation(comments.create)
          .mutation(comments.edit)
          .mutation(comments.delete)
          .mutation(comments.restore)
          .mutation(deliveryOptions.create)
          .mutation(deliveryOptions.edit)
          .mutation(deliveryOptions.delete)
          .mutation(deliveryOptions.restore)
          .mutation(invoices.create)
          .mutation(orders.create)
          .mutation(orders.edit)
          .mutation(orders.approve)
          .mutation(orders.transitionRoomWorkflowStatus)
          .mutation(orders.transitionSharedAccountWorkflowStatus)
          .mutation(orders.delete)
          .mutation(orders.restore)
          .mutation(products.create)
          .mutation(products.edit)
          .mutation(products.publish)
          .mutation(products.draft)
          .mutation(products.delete)
          .mutation(products.restore)
          .mutation(rooms.create)
          .mutation(rooms.edit)
          .mutation(rooms.publish)
          .mutation(rooms.draft)
          .mutation(rooms.delete)
          .mutation(rooms.restore)
          .mutation(sharedAccounts.edit)
          .mutation(sharedAccounts.delete)
          .mutation(sharedAccounts.restore)
          .mutation(sharedAccountManagerAccess.create)
          .mutation(sharedAccountManagerAccess.delete)
          .mutation(sharedAccountManagerAccess.restore)
          .mutation(tenants.edit)
          .mutation(users.edit)
          .mutation(users.delete)
          .mutation(users.restore)
          .mutation(workflowStatuses.append)
          .mutation(workflowStatuses.edit)
          .mutation(workflowStatuses.reorder)
          .mutation(workflowStatuses.delete)
          .final();

        return { client };
      }),
    },
  ) {}
}
