import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { MutationsDispatcher } from ".";
import { AnnouncementsMutations } from "../../../announcements/client/mutations";
import { CommentsMutations } from "../../../comments/client/mutations";
import { DeliveryOptionsMutations } from "../../../delivery-options/client/mutations";
import { InvoicesMutations } from "../../../invoices/client/mutations";
import { OrdersMutations } from "../../../orders/client/mutations";
import { Mutations } from "../../../procedures/mutations";
import { ProductsMutations } from "../../../products/client/mutations";
import { RoomsMutations } from "../../../rooms/client/mutations";
import { SharedAccountManagerAccessMutations } from "../../../shared-accounts/client/manager-access/mutations";
import { SharedAccountsMutations } from "../../../shared-accounts/client/mutations";
import { TenantsMutations } from "../../../tenants/client/mutations";
import { UsersMutations } from "../../../users/client/mutations";
import { WorkflowStatusesMutations } from "../../../workflows/client/status/mutations";
import { MutationsContract } from "../../contract";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const announcements = yield* AnnouncementsMutations;
  const comments = yield* CommentsMutations;
  const deliveryOptions = yield* DeliveryOptionsMutations;
  const invoices = yield* InvoicesMutations;
  const orders = yield* OrdersMutations;
  const products = yield* ProductsMutations;
  const rooms = yield* RoomsMutations;
  const sharedAccounts = yield* SharedAccountsMutations;
  const sharedAccountManagerAccess = yield* SharedAccountManagerAccessMutations;
  const tenants = yield* TenantsMutations;
  const users = yield* UsersMutations;
  const workflowStatuses = yield* WorkflowStatusesMutations;

  return new MutationsContract.Dispatcher({
    procedureRegistry: Mutations.registry,
  })
    .mutation(announcements.create)
    .mutation(announcements.edit)
    .mutation(announcements.delete)
    .mutation(announcements.restore)
    .mutation(comments.create)
    .mutation(comments.edit)
    .mutation(comments.delete)
    .mutation(comments.restore)
    .mutation(deliveryOptions.create)
    .mutation(deliveryOptions.edit)
    .mutation(deliveryOptions.delete)
    .mutation(deliveryOptions.restore)
    .mutation(invoices.create)
    .mutation(orders.create)
    .mutation(orders.edit)
    .mutation(orders.approve)
    .mutation(orders.transitionRoomWorkflowStatus)
    .mutation(orders.transitionSharedAccountWorkflowStatus)
    .mutation(orders.delete)
    .mutation(orders.restore)
    .mutation(products.create)
    .mutation(products.edit)
    .mutation(products.publish)
    .mutation(products.draft)
    .mutation(products.delete)
    .mutation(products.restore)
    .mutation(rooms.create)
    .mutation(rooms.edit)
    .mutation(rooms.publish)
    .mutation(rooms.draft)
    .mutation(rooms.delete)
    .mutation(rooms.restore)
    .mutation(sharedAccounts.edit)
    .mutation(sharedAccounts.delete)
    .mutation(sharedAccounts.restore)
    .mutation(sharedAccountManagerAccess.create)
    .mutation(sharedAccountManagerAccess.delete)
    .mutation(sharedAccountManagerAccess.restore)
    .mutation(tenants.edit)
    .mutation(users.edit)
    .mutation(users.delete)
    .mutation(users.restore)
    .mutation(workflowStatuses.append)
    .mutation(workflowStatuses.edit)
    .mutation(workflowStatuses.reorder)
    .mutation(workflowStatuses.delete)
    .final();
});

export const layer = makeService.pipe(Layer.effect(MutationsDispatcher));
