import { Effect } from "effect";

import { DataAccess } from ".";
import { AnnouncementsContract } from "../announcements2/contract";
import {
  BillingAccountManagerAuthorizationsContract,
  BillingAccountsContract,
} from "../billing-accounts2/contracts";
import { CommentsContract } from "../comments2/contract";
import { InvoicesContract } from "../invoices2/contract";
import { OrdersContract } from "../orders2/contract";
import { ProductsContract } from "../products2/contract";
import {
  DeliveryOptionsContract,
  RoomsContract,
  WorkflowsContract,
} from "../rooms2/contracts";
import { LicensesContract, TenantsContract } from "../tenants2/contracts";
import { UsersContract } from "../users2/contract";

export namespace DataAccessFunctions {
  export class Policies extends Effect.Service<Policies>()(
    "@printdesk/core/data-access/Policies",
    {
      accessors: true,
      succeed: {
        registry: new DataAccess.PolicyRegistry()
          .register(BillingAccountsContract.hasActiveManagerAuthorization)
          .register(BillingAccountsContract.hasActiveCustomerAuthorization)
          .register(BillingAccountsContract.hasActiveAuthorization)
          .register(CommentsContract.isAuthor)
          .register(OrdersContract.isCustomer)
          .register(OrdersContract.isManager)
          .register(OrdersContract.isCustomerOrManager)
          .register(OrdersContract.hasActiveManagerAuthorization)
          .register(OrdersContract.canEdit)
          .register(OrdersContract.canApprove)
          .register(OrdersContract.canTransition)
          .register(OrdersContract.canDelete)
          .register(TenantsContract.isSubdomainAvailable)
          .register(LicensesContract.isAvailable)
          .register(UsersContract.isSelf),
      },
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/data-access/Mutations",
    {
      accessors: true,
      effect: Effect.gen(function* () {
        const session = yield* Effect.succeed({
          userId: "TODO",
          tenantId: "TODO",
        });

        const registry = new DataAccess.MutationRegistry({ session })
          .register(AnnouncementsContract.create)
          .register(AnnouncementsContract.update)
          .register(AnnouncementsContract.delete_)
          .register(BillingAccountsContract.update)
          .register(BillingAccountsContract.delete_)
          .register(BillingAccountManagerAuthorizationsContract.create)
          .register(BillingAccountManagerAuthorizationsContract.delete_)
          .register(CommentsContract.create)
          .register(CommentsContract.update)
          .register(CommentsContract.delete_)
          .register(DeliveryOptionsContract.set)
          .register(InvoicesContract.create)
          .register(OrdersContract.create)
          .register(OrdersContract.edit)
          .register(OrdersContract.approve)
          .register(OrdersContract.transition)
          .register(OrdersContract.delete_)
          .register(ProductsContract.create)
          .register(ProductsContract.update)
          .register(ProductsContract.delete_)
          .register(RoomsContract.create)
          .register(RoomsContract.update)
          .register(RoomsContract.delete_)
          .register(RoomsContract.restore)
          .register(TenantsContract.update)
          .register(UsersContract.update)
          .register(UsersContract.delete_)
          .register(UsersContract.restore)
          .register(WorkflowsContract.set);

        return { registry } as const;
      }),
    },
  ) {}
}
