import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { CommentsSync } from ".";
import { AccessControl } from "../../access-control";
import { Sync } from "../../sync";
import { CommentsRepository } from "../repository";
import { comments } from "../sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* CommentsRepository;

  const streamer = new Sync.EntityStreamerBuilder(comments.name)
    .source(AccessControl.userPermissionPolicy("comments:read"), {
      findCreates: repository.findCreates,
      findUpdates: repository.findUpdates,
      findDeletes: repository.findDeletes,
      fastForward: repository.findFastForward,
    })
    .source(AccessControl.userPermissionPolicy("active_comments:read"), {
      findCreates: repository.findActiveCreates,
      findUpdates: repository.findActiveUpdates,
      findDeletes: repository.findActiveDeletes,
      fastForward: repository.findActiveFastForward,
    })
    .source(AccessControl.userPermissionPolicy("active_customer_placed_order_comments:read"), {
      findCreates: repository.findActiveCustomerPlacedOrderCreates,
      findUpdates: repository.findActiveCustomerPlacedOrderUpdates,
      findDeletes: repository.findActiveCustomerPlacedOrderDeletes,
      fastForward: repository.findActiveCustomerPlacedOrderFastForward,
    })
    .source(
      AccessControl.userPermissionPolicy(
        "active_manager_authorized_shared_account_order_comments:read",
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

export const layer = makeService.pipe(Layer.effect(CommentsSync));
