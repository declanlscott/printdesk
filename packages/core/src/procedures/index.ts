import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

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
      effect: Effect.gen(function* () {
        const procedures = yield* Effect.succeed(
          new ProceduresContract.Procedures()
            .set(CommentsContract.isAuthor)
            .set(OrdersContract.isCustomer)
            .set(OrdersContract.isManager)
            .set(OrdersContract.isCustomerOrManager)
            .set(OrdersContract.isManagerAuthorized)
            .set(SharedAccountsContract.isCustomerAuthorized)
            .set(SharedAccountsContract.isManagerAuthorized)
            .set(SharedAccountWorkflowsContract.isCustomerAuthorized)
            .set(SharedAccountWorkflowsContract.isManagerAuthorized)
            .set(UsersContract.isSelf)
            .done(),
        ).pipe(Effect.cached);

        const Policy = yield* procedures.pipe(
          Effect.map(Struct.get("Procedure")),
          Effect.cached,
        );

        return { procedures, Policy } as const;
      }),
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/procedures/Mutations",
    {
      accessors: true,
      effect: Effect.gen(function* () {
        const procedures = yield* Effect.succeed(
          new ProceduresContract.Procedures()
            .set(AnnouncementsContract.create)
            .set(AnnouncementsContract.edit)
            .set(AnnouncementsContract.delete_)
            .set(AnnouncementsContract.restore)
            .set(CommentsContract.create)
            .set(CommentsContract.edit)
            .set(CommentsContract.delete_)
            .set(CommentsContract.restore)
            .set(DeliveryOptionsContract.create)
            .set(DeliveryOptionsContract.edit)
            .set(DeliveryOptionsContract.delete_)
            .set(DeliveryOptionsContract.restore)
            .set(InvoicesContract.create)
            .set(OrdersContract.create)
            .set(OrdersContract.edit)
            .set(OrdersContract.approve)
            .set(OrdersContract.transitionRoomWorkflowStatus)
            .set(OrdersContract.transitionSharedAccountWorkflowStatus)
            .set(OrdersContract.delete_)
            .set(OrdersContract.restore)
            .set(ProductsContract.create)
            .set(ProductsContract.edit)
            .set(ProductsContract.publish)
            .set(ProductsContract.draft)
            .set(ProductsContract.delete_)
            .set(ProductsContract.restore)
            .set(RoomsContract.create)
            .set(RoomsContract.edit)
            .set(RoomsContract.publish)
            .set(RoomsContract.draft)
            .set(RoomsContract.delete_)
            .set(RoomsContract.restore)
            .set(SharedAccountsContract.edit)
            .set(SharedAccountsContract.delete_)
            .set(SharedAccountsContract.restore)
            .set(SharedAccountManagerAuthorizationsContract.create)
            .set(SharedAccountManagerAuthorizationsContract.delete_)
            .set(SharedAccountManagerAuthorizationsContract.restore)
            .set(TenantsContract.edit)
            .set(UsersContract.edit)
            .set(UsersContract.delete_)
            .set(UsersContract.restore)
            .set(WorkflowStatusesContract.append)
            .set(WorkflowStatusesContract.edit)
            .set(WorkflowStatusesContract.reorder)
            .set(WorkflowStatusesContract.delete_)
            .done(),
        ).pipe(Effect.cached);

        const Replicache = yield* procedures.pipe(
          Effect.map(Struct.get("Procedure")),
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

        return { procedures, Replicache };
      }),
    },
  ) {}
}
