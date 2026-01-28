import * as Effect from "effect/Effect";
import * as Function from "effect/Function";
import * as Schema from "effect/Schema";

import { AnnouncementsContract } from "../announcements/contract";
import { CommentsContract } from "../comments/contract";
import { DeliveryOptionsContract } from "../delivery-options/contract";
import { InvoicesContract } from "../invoices/contract";
import { OrdersContract } from "../orders/contract";
import { ProductsContract } from "../products/contract";
import { RoomsContract } from "../rooms/contract";
import {
  SharedAccountManagerAccessContract,
  SharedAccountsContract,
} from "../shared-accounts/contracts";
import { TenantsContract } from "../tenants/contracts";
import { UsersContract } from "../users/contract";
import {
  SharedAccountWorkflowsContract,
  WorkflowStatusesContract,
} from "../workflows/contracts";
import { ProceduresContract } from "./contract";

export namespace Procedures {
  export class Policies extends Effect.Service<Policies>()(
    "@printdesk/core/procedures/Policies",
    {
      accessors: true,
      sync: () => ({
        registry: new ProceduresContract.Registry()
          .procedure(CommentsContract.isAuthor)
          .procedure(OrdersContract.isCustomer)
          .procedure(OrdersContract.isManager)
          .procedure(OrdersContract.isCustomerOrManager)
          .procedure(OrdersContract.isManagerAuthorized)
          .procedure(SharedAccountsContract.isCustomerAuthorized)
          .procedure(SharedAccountsContract.isManagerAuthorized)
          .procedure(SharedAccountWorkflowsContract.isCustomerAuthorized)
          .procedure(SharedAccountWorkflowsContract.isManagerAuthorized)
          .procedure(UsersContract.isSelf)
          .final(),
      }),
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/procedures/Mutations",
    {
      accessors: true,
      sync: () => {
        const registry = new ProceduresContract.Registry()
          .procedure(AnnouncementsContract.create)
          .procedure(AnnouncementsContract.edit)
          .procedure(AnnouncementsContract.delete_)
          .procedure(AnnouncementsContract.restore)
          .procedure(CommentsContract.create)
          .procedure(CommentsContract.edit)
          .procedure(CommentsContract.delete_)
          .procedure(CommentsContract.restore)
          .procedure(DeliveryOptionsContract.create)
          .procedure(DeliveryOptionsContract.edit)
          .procedure(DeliveryOptionsContract.delete_)
          .procedure(DeliveryOptionsContract.restore)
          .procedure(InvoicesContract.create)
          .procedure(OrdersContract.create)
          .procedure(OrdersContract.edit)
          .procedure(OrdersContract.approve)
          .procedure(OrdersContract.transitionRoomWorkflowStatus)
          .procedure(OrdersContract.transitionSharedAccountWorkflowStatus)
          .procedure(OrdersContract.delete_)
          .procedure(OrdersContract.restore)
          .procedure(ProductsContract.create)
          .procedure(ProductsContract.edit)
          .procedure(ProductsContract.publish)
          .procedure(ProductsContract.draft)
          .procedure(ProductsContract.delete_)
          .procedure(ProductsContract.restore)
          .procedure(RoomsContract.create)
          .procedure(RoomsContract.edit)
          .procedure(RoomsContract.publish)
          .procedure(RoomsContract.draft)
          .procedure(RoomsContract.delete_)
          .procedure(RoomsContract.restore)
          .procedure(SharedAccountsContract.edit)
          .procedure(SharedAccountsContract.delete_)
          .procedure(SharedAccountsContract.restore)
          .procedure(SharedAccountManagerAccessContract.create)
          .procedure(SharedAccountManagerAccessContract.delete_)
          .procedure(SharedAccountManagerAccessContract.restore)
          .procedure(TenantsContract.edit)
          .procedure(UsersContract.edit)
          .procedure(UsersContract.delete_)
          .procedure(UsersContract.restore)
          .procedure(WorkflowStatusesContract.append)
          .procedure(WorkflowStatusesContract.edit)
          .procedure(WorkflowStatusesContract.reorder)
          .procedure(WorkflowStatusesContract.delete_)
          .final();

        const ReplicacheV0 = Schema.Struct({
          name: Schema.String,
          args: Schema.Any,
        }).pipe(
          Schema.transform(registry.Schema, {
            strict: false,
            decode: Function.identity,
            encode: Function.identity,
          }),
          Schema.extend(
            Schema.Struct({
              id: Schema.Int,
              timestamp: Schema.Number,
            }),
          ),
        );

        const ReplicacheV1 = ReplicacheV0.pipe(
          Schema.extend(
            Schema.Struct({
              clientId: Schema.UUID.pipe(
                Schema.propertySignature,
                Schema.fromKey("clientID"),
              ),
            }),
          ),
        );

        return { registry, ReplicacheV0, ReplicacheV1 } as const;
      },
    },
  ) {}
}
