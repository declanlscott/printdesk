import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { OrdersSync } from ".";
import { AccessControl } from "../../access-control";
import { SyncContract } from "../../sync/contract";
import { OrdersRepository } from "../repository";
import { orders } from "../sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* OrdersRepository;

  const streamer = new SyncContract.EntityStreamerBuilder(orders.name)
    .source(AccessControl.userPermissionPolicy("orders:read"), {
      findCreates: repository.findCreates,
      findUpdates: repository.findUpdates,
      findDeletes: repository.findDeletes,
      fastForward: repository.findFastForward,
    })
    .source(AccessControl.userPermissionPolicy("active_orders:read"), {
      findCreates: repository.findActiveCreates,
      findUpdates: repository.findActiveUpdates,
      findDeletes: repository.findActiveDeletes,
      fastForward: repository.findActiveFastForward,
    })
    .source(AccessControl.userPermissionPolicy("active_customer_placed_orders:read"), {
      findCreates: repository.findActiveCustomerPlacedCreates,
      findUpdates: repository.findActiveCustomerPlacedUpdates,
      findDeletes: repository.findActiveCustomerPlacedDeletes,
      fastForward: repository.findActiveCustomerPlacedFastForward,
    })
    .source(
      AccessControl.userPermissionPolicy("active_manager_authorized_shared_account_orders:read"),
      {
        findCreates: repository.findActiveManagerAuthorizedSharedAccountCreates,
        findUpdates: repository.findActiveManagerAuthorizedSharedAccountUpdates,
        findDeletes: repository.findActiveManagerAuthorizedSharedAccountDeletes,
        fastForward: repository.findActiveManagerAuthorizedSharedAccountFastForward,
      },
    )
    .build();

  return { streamer } as const;
});

export const layer = makeService.pipe(Layer.effect(OrdersSync));
