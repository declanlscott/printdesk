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
import { ProceduresContract } from "./contract";

export namespace Mutations {
  export const registry = new ProceduresContract.Registry()
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

  export type Record = typeof registry.record;
}
