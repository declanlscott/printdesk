import { Effect } from "effect";

import { DataAccess } from ".";
import { AnnouncementsContract } from "../announcements2/contract";
import { Auth } from "../auth2";
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
      sync: () => {
        const policies = new DataAccess.Functions()
          .add(BillingAccountsContract.hasActiveManagerAuthorization)
          .add(BillingAccountsContract.hasActiveCustomerAuthorization)
          .add(BillingAccountsContract.hasActiveAuthorization)
          .add(CommentsContract.isAuthor)
          .add(OrdersContract.isCustomer)
          .add(OrdersContract.isManager)
          .add(OrdersContract.isCustomerOrManager)
          .add(OrdersContract.hasActiveManagerAuthorization)
          .add(OrdersContract.canEdit)
          .add(OrdersContract.canApprove)
          .add(OrdersContract.canTransition)
          .add(OrdersContract.canDelete)
          .add(TenantsContract.isSubdomainAvailable)
          .add(LicensesContract.isAvailable)
          .add(UsersContract.isSelf)
          .done();

        const dispatcher = new DataAccess.PolicyDispatcher<
          (typeof policies)["$inferRecord"]
        >({ map: policies.map });

        return { policies, dispatcher };
      },
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/data-access/Mutations",
    {
      accessors: true,
      effect: Effect.gen(function* () {
        const session = yield* Auth.Session;

        const mutations = new DataAccess.Functions()
          .add(AnnouncementsContract.create)
          .add(AnnouncementsContract.update)
          .add(AnnouncementsContract.delete_)
          .add(BillingAccountsContract.update)
          .add(BillingAccountsContract.delete_)
          .add(BillingAccountManagerAuthorizationsContract.create)
          .add(BillingAccountManagerAuthorizationsContract.delete_)
          .add(CommentsContract.create)
          .add(CommentsContract.update)
          .add(CommentsContract.delete_)
          .add(DeliveryOptionsContract.set)
          .add(InvoicesContract.create)
          .add(OrdersContract.create)
          .add(OrdersContract.edit)
          .add(OrdersContract.approve)
          .add(OrdersContract.transition)
          .add(OrdersContract.delete_)
          .add(ProductsContract.create)
          .add(ProductsContract.update)
          .add(ProductsContract.delete_)
          .add(RoomsContract.create)
          .add(RoomsContract.update)
          .add(RoomsContract.delete_)
          .add(RoomsContract.restore)
          .add(TenantsContract.update)
          .add(UsersContract.update)
          .add(UsersContract.delete_)
          .add(UsersContract.restore)
          .add(WorkflowsContract.set)
          .done();

        const dispatcher = new DataAccess.MutationDispatcher<
          typeof mutations.RecordType
        >({ session, map: mutations.map });

        return { mutations, dispatcher };
      }),
    },
  ) {}
}
