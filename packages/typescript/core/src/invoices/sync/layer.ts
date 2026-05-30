import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { InvoicesSync } from ".";
import { AccessControl } from "../../access-control";
import { Sync } from "../../sync";
import { InvoicesRepository } from "../repository";
import { invoices } from "../sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* InvoicesRepository;

  const streamer = new Sync.EntityStreamerBuilder(invoices.name)
    .source(AccessControl.userPermissionPolicy("invoices:read"), {
      findCreates: repository.findCreates,
      findUpdates: repository.findUpdates,
      findDeletes: repository.findDeletes,
      fastForward: repository.findFastForward,
    })
    .source(AccessControl.userPermissionPolicy("active_invoices:read"), {
      findCreates: repository.findActiveCreates,
      findUpdates: repository.findActiveUpdates,
      findDeletes: repository.findActiveDeletes,
      fastForward: repository.findActiveFastForward,
    })
    .source(AccessControl.userPermissionPolicy("active_customer_placed_order_invoices:read"), {
      findCreates: repository.findActiveCustomerPlacedOrderCreates,
      findUpdates: repository.findActiveCustomerPlacedOrderUpdates,
      findDeletes: repository.findActiveCustomerPlacedOrderDeletes,
      fastForward: repository.findActiveCustomerPlacedOrderFastForward,
    })
    .source(
      AccessControl.userPermissionPolicy(
        "active_manager_authorized_shared_account_order_invoices:read",
      ),
      {
        findCreates: repository.findActiveManagerAuthorizedSharedAccountOrderCreates,
        findUpdates: repository.findActiveManagerAuthorizedSharedAccountOrderUpdates,
        findDeletes: repository.findActiveManagerAuthorizedSharedAccountOrderDeletes,
        fastForward: repository.findActiveManagerAuthorizedSharedAccountOrderFastForward,
      },
    )
    .build();

  return { streamer } as const;
});

export const layer = makeService.pipe(Layer.effect(InvoicesSync));
