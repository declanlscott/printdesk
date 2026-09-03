import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { OrderObjectsSync } from ".";
import { AccessControl } from "../../../access-control";
import { Sync } from "../../../sync";
import { orderObjects } from "../../sql";
import { OrderObjectsSyncRepository } from "../repositories";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* OrderObjectsSyncRepository;

  const streamer = new Sync.EntityStreamerBuilder(orderObjects.name)
    .source(AccessControl.userPermissionPolicy("order_objects:read"), {
      findCreates: repository.findCreates,
      findUpdates: repository.findUpdates,
      findDeletes: repository.findDeletes,
      fastForward: repository.findFastForward,
    })
    .source(AccessControl.userPermissionPolicy("active_order_objects:read"), {
      findCreates: repository.findActiveCreates,
      findUpdates: repository.findActiveUpdates,
      findDeletes: repository.findActiveDeletes,
      fastForward: repository.findActiveFastForward,
    })
    .source(AccessControl.userPermissionPolicy("active_customer_placed_order_objects:read"), {
      findCreates: repository.findActiveCustomerPlacedCreates,
      findUpdates: repository.findActiveCustomerPlacedUpdates,
      findDeletes: repository.findActiveCustomerPlacedDeletes,
      fastForward: repository.findActiveCustomerPlacedFastForward,
    })
    .source(
      AccessControl.userPermissionPolicy(
        "active_manager_authorized_shared_account_order_objects:read",
      ),
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

export const layer = makeService.pipe(Layer.effect(OrderObjectsSync));
