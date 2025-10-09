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
import { DataAccessProcedures } from "./procedures";

export namespace DataAccess {
  export class ClientPolicies extends Effect.Service<ClientPolicies>()(
    "@printdesk/core/data-access/ClientPolicies",
    {
      accessors: true,
      dependencies: [
        DataAccessProcedures.Policies.Default,
        Comments.Policies.Default,
        Orders.Policies.Default,
        SharedAccounts.Policies.Default,
        SharedAccountWorkflows.Policies.Default,
        Users.Policies.Default,
      ],
      effect: Effect.gen(function* () {
        const procedures = yield* DataAccessProcedures.Policies.procedures;

        const comments = yield* Comments.Policies;
        const orders = yield* Orders.Policies;
        const sharedAccounts = yield* SharedAccounts.Policies;
        const sharedAccountWorkflows = yield* SharedAccountWorkflows.Policies;
        const users = yield* Users.Policies;

        const dispatcher = yield* Effect.succeed(
          new DataAccessContract.PolicyDispatcher({ procedures })
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

        return { dispatcher } as const;
      }),
    },
  ) {}

  export class ClientMutations extends Effect.Service<ClientMutations>()(
    "@printdesk/core/data-access/ClientMutations",
    {
      accessors: true,
      dependencies: [
        DataAccessProcedures.Mutations.Default,
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
        const procedures = yield* DataAccessProcedures.Mutations.procedures;

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
          new DataAccessContract.MutationDispatcher({
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

        return { dispatcher } as const;
      }),
    },
  ) {}
}
