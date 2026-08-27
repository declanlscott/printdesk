import { Handler } from ".";
import { AnnouncementsContract } from "../announcements/contract";
import { CommentsContract } from "../comments/contract";
import { DeliveryOptionsContract } from "../delivery-options/contract";
import { GroupsContract } from "../groups/contracts";
import { OrdersContract } from "../orders/contract";
import { ProductsContract } from "../products/contract";
import { RoomsContract } from "../rooms/contract";
import {
  SharedAccountManagerAccessContract,
  SharedAccountsContract,
} from "../shared-accounts/contracts";
import { UsersContract } from "../users/contract";
import { SharedAccountWorkflowsContract, WorkflowStatusesContract } from "../workflows/contracts";

export namespace PolicyHandlers {
  export const registry = new Handler.Registry()
    .handle(AnnouncementsContract.canEdit)
    .handle(AnnouncementsContract.canDelete)
    .handle(AnnouncementsContract.canRestore)
    .handle(CommentsContract.isAuthor)
    .handle(CommentsContract.canEdit)
    .handle(CommentsContract.canDelete)
    .handle(CommentsContract.canRestore)
    .handle(DeliveryOptionsContract.canEdit)
    .handle(DeliveryOptionsContract.canDelete)
    .handle(DeliveryOptionsContract.canRestore)
    .handle(GroupsContract.isMemberOf)
    .handle(OrdersContract.isCustomer)
    .handle(OrdersContract.isManager)
    .handle(OrdersContract.isCustomerOrManager)
    .handle(OrdersContract.isManagerAuthorized)
    .handle(OrdersContract.canEdit)
    .handle(OrdersContract.canApprove)
    .handle(OrdersContract.canTransition)
    .handle(OrdersContract.canDelete)
    .handle(OrdersContract.canRestore)
    .handle(ProductsContract.canEdit)
    .handle(ProductsContract.canDelete)
    .handle(ProductsContract.canRestore)
    .handle(RoomsContract.canEdit)
    .handle(RoomsContract.canDelete)
    .handle(RoomsContract.canRestore)
    .handle(SharedAccountsContract.isCustomerAuthorized)
    .handle(SharedAccountsContract.isManagerAuthorized)
    .handle(SharedAccountsContract.canEdit)
    .handle(SharedAccountsContract.canDelete)
    .handle(SharedAccountsContract.canRestore)
    .handle(SharedAccountManagerAccessContract.canDelete)
    .handle(SharedAccountManagerAccessContract.canRestore)
    .handle(SharedAccountWorkflowsContract.isCustomerAuthorized)
    .handle(SharedAccountWorkflowsContract.isManagerAuthorized)
    .handle(UsersContract.isSelf)
    .handle(UsersContract.canEdit)
    .handle(UsersContract.canDelete)
    .handle(UsersContract.canRestore)
    .handle(WorkflowStatusesContract.canEdit)
    .handle(WorkflowStatusesContract.canDelete)
    .final();

  export type Record = typeof registry.record;
}
