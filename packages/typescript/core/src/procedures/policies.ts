import { CommentsContract } from "../comments/contract";
import { OrdersContract } from "../orders/contract";
import { SharedAccountsContract } from "../shared-accounts/contracts";
import { UsersContract } from "../users/contract";
import { SharedAccountWorkflowsContract } from "../workflows/contracts";
import { ProceduresContract } from "./contract";

export namespace Policies {
  export const registry = new ProceduresContract.Registry()
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
    .final();

  export type Record = typeof registry.record;
}
