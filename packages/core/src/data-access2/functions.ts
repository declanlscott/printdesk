import { Effect, Schema, Struct } from "effect";

import { AnnouncementsContract } from "../announcements2/contract";
import { CommentsContract } from "../comments2/contract";
import { DeliveryOptionsContract } from "../delivery-options2/contract";
import { InvoicesContract } from "../invoices2/contract";
import { OrdersContract } from "../orders2/contract";
import { ProductsContract } from "../products2/contract";
import { ReplicacheContract } from "../replicache2/contract";
import { RoomsContract } from "../rooms2/contract";
import {
  SharedAccountManagerAuthorizationsContract,
  SharedAccountsContract,
} from "../shared-accounts2/contracts";
import { TenantsContract } from "../tenants2/contracts";
import { UsersContract } from "../users2/contract";
import {
  SharedAccountWorkflowsContract,
  WorkflowStatusesContract,
} from "../workflows2/contracts";
import { DataAccessContract } from "./contract";

export class Policies extends Effect.Service<Policies>()(
  "@printdesk/core/data-access/Policies",
  {
    accessors: true,
    effect: Effect.gen(function* () {
      const functions = yield* Effect.succeed(
        new DataAccessContract.Functions()
          .set(CommentsContract.isAuthor)
          .set(OrdersContract.isCustomer)
          .set(OrdersContract.isManager)
          .set(OrdersContract.isCustomerOrManager)
          .set(OrdersContract.isAuthorizedManager)
          .set(OrdersContract.isEditable)
          .set(OrdersContract.isApprovable)
          .set(OrdersContract.isTransitionable)
          .set(OrdersContract.isDeletable)
          .set(SharedAccountsContract.isCustomerAuthorized)
          .set(SharedAccountsContract.isManagerAuthorized)
          .set(UsersContract.isSelf)
          .set(SharedAccountWorkflowsContract.isManagerAuthorized)
          .set(WorkflowStatusesContract.isEditable)
          .set(WorkflowStatusesContract.isDeletable)
          .done(),
      ).pipe(Effect.cached);

      const Invocation = yield* functions.pipe(
        Effect.map(Struct.get("Invocation")),
        Effect.cached,
      );

      return { functions, Invocation } as const;
    }),
  },
) {}

export class Mutations extends Effect.Service<Mutations>()(
  "@printdesk/core/data-access/Mutations",
  {
    accessors: true,
    effect: Effect.gen(function* () {
      const functions = yield* Effect.succeed(
        new DataAccessContract.Functions()
          .set(AnnouncementsContract.create)
          .set(AnnouncementsContract.update)
          .set(AnnouncementsContract.delete_)
          .set(CommentsContract.create)
          .set(CommentsContract.update)
          .set(CommentsContract.delete_)
          .set(DeliveryOptionsContract.create)
          .set(DeliveryOptionsContract.update)
          .set(DeliveryOptionsContract.delete_)
          .set(InvoicesContract.create)
          .set(OrdersContract.create)
          .set(OrdersContract.edit)
          .set(OrdersContract.approve)
          .set(OrdersContract.transitionRoomWorkflowStatus)
          .set(OrdersContract.transitionSharedAccountWorkflowStatus)
          .set(OrdersContract.delete_)
          .set(ProductsContract.create)
          .set(ProductsContract.edit)
          .set(ProductsContract.publish)
          .set(ProductsContract.draft)
          .set(ProductsContract.delete_)
          .set(RoomsContract.create)
          .set(RoomsContract.edit)
          .set(RoomsContract.publish)
          .set(RoomsContract.draft)
          .set(RoomsContract.delete_)
          .set(RoomsContract.restore)
          .set(SharedAccountsContract.update)
          .set(SharedAccountsContract.delete_)
          .set(SharedAccountManagerAuthorizationsContract.create)
          .set(SharedAccountManagerAuthorizationsContract.delete_)
          .set(TenantsContract.update)
          .set(UsersContract.update)
          .set(UsersContract.delete_)
          .set(UsersContract.restore)
          .set(WorkflowStatusesContract.append)
          .set(WorkflowStatusesContract.edit)
          .set(WorkflowStatusesContract.reorder)
          .set(WorkflowStatusesContract.delete_)
          .done(),
      ).pipe(Effect.cached);

      const Replicache = yield* functions.pipe(
        Effect.map(Struct.get("Invocation")),
        Effect.map(
          Schema.extend(
            Schema.Struct(ReplicacheContract.MutationV1.fields).omit(
              "name",
              "args",
            ),
          ),
        ),
        Effect.cached,
      );

      return { functions, Replicache };
    }),
  },
) {}
