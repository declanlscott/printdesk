import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

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
import { ProceduresContract } from "./contract";

export namespace Procedures {
  export class Policies extends Effect.Service<Policies>()(
    "@printdesk/core/procedures/Policies",
    {
      accessors: true,
      succeed: {
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
      } as const,
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
          .procedure(SharedAccountManagerAuthorizationsContract.create)
          .procedure(SharedAccountManagerAuthorizationsContract.delete_)
          .procedure(SharedAccountManagerAuthorizationsContract.restore)
          .procedure(TenantsContract.edit)
          .procedure(UsersContract.edit)
          .procedure(UsersContract.delete_)
          .procedure(UsersContract.restore)
          .procedure(WorkflowStatusesContract.append)
          .procedure(WorkflowStatusesContract.edit)
          .procedure(WorkflowStatusesContract.reorder)
          .procedure(WorkflowStatusesContract.delete_)
          .final();

        const ReplicacheSchema = registry.Schema.pipe(
          Schema.extend(
            Schema.Struct(ReplicacheContract.MutationV1.fields).omit(
              "name",
              "args",
            ),
          ),
        );

        return { registry, ReplicacheSchema } as const;
      },
    },
  ) {}
}
