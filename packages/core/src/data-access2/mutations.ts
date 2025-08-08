import { Effect } from "effect";

import { DataAccess } from ".";
import {
  createAnnouncement,
  deleteAnnouncement,
  updateAnnouncement,
} from "../announcements2/shared";
import {
  createBillingAccountManagerAuthorization,
  deleteBillingAccount,
  deleteBillingAccountManagerAuthorization,
  updateBillingAccount,
} from "../billing-accounts2/shared";
import {
  createComment,
  deleteComment,
  updateComment,
} from "../comments2/shared";
import { createInvoice } from "../invoices2/shared";
import {
  approveOrder,
  createOrder,
  deleteOrder,
  editOrder,
  transitionOrder,
} from "../orders2/shared";
import {
  createProduct,
  deleteProduct,
  updateProduct,
} from "../products2/shared";
import {
  createRoom,
  deleteRoom,
  restoreRoom,
  setDeliveryOptions,
  setWorkflow,
  updateRoom,
} from "../rooms2/shared";
import { updateTenant } from "../tenants2/shared";
import { deleteUser, restoreUser, updateUser } from "../users2/shared";

export class Mutations extends Effect.Service<Mutations>()(
  "@printdesk/core/data-access/Mutations",
  {
    accessors: true,
    effect: Effect.gen(function* () {
      const session = yield* Effect.succeed({
        userId: "TODO",
        tenantId: "TODO",
      });

      const client = new DataAccess.MutationClient({ session })
        .register(createAnnouncement)
        .register(updateAnnouncement)
        .register(deleteAnnouncement)
        .register(updateBillingAccount)
        .register(deleteBillingAccount)
        .register(createBillingAccountManagerAuthorization)
        .register(deleteBillingAccountManagerAuthorization)
        .register(createComment)
        .register(updateComment)
        .register(deleteComment)
        .register(setDeliveryOptions)
        .register(createInvoice)
        .register(createOrder)
        .register(editOrder)
        .register(approveOrder)
        .register(transitionOrder)
        .register(deleteOrder)
        .register(createProduct)
        .register(updateProduct)
        .register(deleteProduct)
        .register(createRoom)
        .register(updateRoom)
        .register(deleteRoom)
        .register(restoreRoom)
        .register(updateTenant)
        .register(updateUser)
        .register(deleteUser)
        .register(restoreUser)
        .register(setWorkflow);

      return { client } as const;
    }),
  },
) {}
