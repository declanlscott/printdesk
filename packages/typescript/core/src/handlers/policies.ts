import { CommentsContract } from "../comments/contract";
import { OrdersContract } from "../orders/contract";
import { SharedAccountsContract } from "../shared-accounts/contracts";
import { UsersContract } from "../users/contract";
import { SharedAccountWorkflowsContract } from "../workflows/contracts";
import { HandlersContract } from "./contract";

export namespace Policies {
  export const registry = new HandlersContract.Registry()
    .handle(CommentsContract.isAuthor)
    .handle(OrdersContract.isCustomer)
    .handle(OrdersContract.isManager)
    .handle(OrdersContract.isCustomerOrManager)
    .handle(OrdersContract.isManagerAuthorized)
    .handle(SharedAccountsContract.isCustomerAuthorized)
    .handle(SharedAccountsContract.isManagerAuthorized)
    .handle(SharedAccountWorkflowsContract.isCustomerAuthorized)
    .handle(SharedAccountWorkflowsContract.isManagerAuthorized)
    .handle(UsersContract.isSelf)
    .final();

  export type Record = typeof registry.record;
}
