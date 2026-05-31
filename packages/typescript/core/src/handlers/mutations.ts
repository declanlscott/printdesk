import { AnnouncementsContract } from "../announcements/contract";
import { CommentsContract } from "../comments/contract";
import { DeliveryOptionsContract } from "../delivery-options/contract";
import { InvoicesContract } from "../invoices/contract";
import { OrdersContract } from "../orders/contract";
import { ProductsContract } from "../products/contract";
import { RoomsContract } from "../rooms/contract";
import {
  SharedAccountsContract,
  SharedAccountManagerAccessContract,
} from "../shared-accounts/contracts";
import { TenantsContract } from "../tenants/contract";
import { UsersContract } from "../users/contract";
import { WorkflowStatusesContract } from "../workflows/contracts";
import { HandlersContract } from "./contract";

export namespace Mutations {
  export const registry = new HandlersContract.Registry()
    .handle(AnnouncementsContract.create)
    .handle(AnnouncementsContract.edit)
    .handle(AnnouncementsContract.delete_)
    .handle(AnnouncementsContract.restore)
    .handle(CommentsContract.create)
    .handle(CommentsContract.edit)
    .handle(CommentsContract.delete_)
    .handle(CommentsContract.restore)
    .handle(DeliveryOptionsContract.create)
    .handle(DeliveryOptionsContract.edit)
    .handle(DeliveryOptionsContract.delete_)
    .handle(DeliveryOptionsContract.restore)
    .handle(InvoicesContract.create)
    .handle(OrdersContract.create)
    .handle(OrdersContract.edit)
    .handle(OrdersContract.approve)
    .handle(OrdersContract.transitionRoomWorkflowStatus)
    .handle(OrdersContract.transitionSharedAccountWorkflowStatus)
    .handle(OrdersContract.delete_)
    .handle(OrdersContract.restore)
    .handle(ProductsContract.create)
    .handle(ProductsContract.edit)
    .handle(ProductsContract.publish)
    .handle(ProductsContract.draft)
    .handle(ProductsContract.delete_)
    .handle(ProductsContract.restore)
    .handle(RoomsContract.create)
    .handle(RoomsContract.edit)
    .handle(RoomsContract.publish)
    .handle(RoomsContract.draft)
    .handle(RoomsContract.delete_)
    .handle(RoomsContract.restore)
    .handle(SharedAccountsContract.edit)
    .handle(SharedAccountsContract.delete_)
    .handle(SharedAccountsContract.restore)
    .handle(SharedAccountManagerAccessContract.create)
    .handle(SharedAccountManagerAccessContract.delete_)
    .handle(SharedAccountManagerAccessContract.restore)
    .handle(TenantsContract.edit)
    .handle(UsersContract.edit)
    .handle(UsersContract.delete_)
    .handle(UsersContract.restore)
    .handle(WorkflowStatusesContract.append)
    .handle(WorkflowStatusesContract.edit)
    .handle(WorkflowStatusesContract.reorder)
    .handle(WorkflowStatusesContract.delete_)
    .final();

  export type Record = typeof registry.record;
}
