import { Effect } from "effect";

import { Announcements } from "../announcements2/client";
import { Auth } from "../auth2";
import { Comments } from "../comments2/client";
import { DeliveryOptions } from "../delivery-options2/client";
import { Invoices } from "../invoices2/client";
import { Orders } from "../orders2/client";
import { Products } from "../products2/client";
import { Rooms } from "../rooms2/client";
import { SharedAccounts } from "../shared-accounts2/client";
import { Tenants } from "../tenants2/client";
import { Users } from "../users2/client";
import { SharedAccountWorkflows, WorkflowStatuses } from "../workflows2/client";
import { DataAccessContract } from "./contract";
import { Mutations, Policies } from "./functions";

export namespace DataAccess {
  export class ClientPolicies extends Effect.Service<ClientPolicies>()(
    "@printdesk/core/data-access/ClientPolicies",
    {
      accessors: true,
      dependencies: [
        Policies.Default,
        SharedAccounts.Policies.Default,
        Comments.Policies.Default,
        Orders.Policies.Default,
        Users.Policies.Default,
        SharedAccountWorkflows.Policies.Default,
        WorkflowStatuses.Policies.Default,
      ],
      effect: Effect.gen(function* () {
        const functions = yield* Policies.functions;

        const sharedAccounts = yield* SharedAccounts.Policies;
        const comments = yield* Comments.Policies;
        const orders = yield* Orders.Policies;
        const users = yield* Users.Policies;
        const sharedAccountWorkflows = yield* SharedAccountWorkflows.Policies;
        const workflowStatuses = yield* WorkflowStatuses.Policies;

        const dispatcher = yield* Effect.succeed(
          new DataAccessContract.PolicyDispatcher({ functions })
            .set(comments.isAuthor)
            .set(orders.isCustomer)
            .set(orders.isManager)
            .set(orders.isCustomerOrManager)
            .set(orders.isManagerAuthorized)
            .set(orders.isEditable)
            .set(orders.isApprovable)
            .set(orders.isTransitionable)
            .set(orders.isDeletable)
            .set(sharedAccounts.isCustomerAuthorized)
            .set(sharedAccounts.isManagerAuthorized)
            .set(users.isSelf)
            .set(sharedAccountWorkflows.isManagerAuthorized)
            .set(workflowStatuses.isEditable)
            .set(workflowStatuses.isDeletable)
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
        const functions = yield* Mutations.functions;

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

        const dispatcher = yield* Effect.succeed(
          new DataAccessContract.MutationDispatcher({ session, functions })
            .set(announcements.create)
            .set(announcements.update)
            .set(announcements.delete)
            .set(comments.create)
            .set(comments.update)
            .set(comments.delete)
            .set(deliveryOptions.create)
            .set(deliveryOptions.update)
            .set(deliveryOptions.delete)
            .set(invoices.create)
            .set(orders.create)
            .set(orders.edit)
            .set(orders.approve)
            .set(orders.transitionRoomWorkflowStatus)
            .set(orders.transitionSharedAccountWorkflowStatus)
            .set(orders.delete)
            .set(products.create)
            .set(products.edit)
            .set(products.publish)
            .set(products.draft)
            .set(products.delete)
            .set(rooms.create)
            .set(rooms.edit)
            .set(rooms.publish)
            .set(rooms.draft)
            .set(rooms.delete)
            .set(rooms.restore)
            .set(sharedAccounts.update)
            .set(sharedAccounts.delete)
            .set(sharedAccountManagerAuthorizations.create)
            .set(sharedAccountManagerAuthorizations.delete)
            .set(tenants.update)
            .set(users.update)
            .set(users.delete)
            .set(users.restore)
            .set(workflowStatuses.append)
            .set(workflowStatuses.edit)
            .set(workflowStatuses.reorder)
            .set(workflowStatuses.delete)
            .done(),
        ).pipe(Effect.cached);

        return { dispatcher } as const;
      }),
    },
  ) {}
}
